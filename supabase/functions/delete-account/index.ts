const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": origin,
  "Vary": "Origin",
});

const json = (body: unknown, status: number, origin: string) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
);

async function readSmallBody(request: Request, limit: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Request body exceeds the allowed size.");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

Deno.serve(async (request: Request) => {
  const appOrigin = Deno.env.get("APP_ORIGIN") || "";
  const origin = request.headers.get("origin") || "";
  if (!appOrigin || origin !== appOrigin) return new Response("Origin is not allowed.", { status: 403 });
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(appOrigin) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, appOrigin);

  const base = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base || !anonKey || !serviceKey) return json({ error: "Account deletion is not configured." }, 503, appOrigin);

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "A signed-in session is required." }, 401, appOrigin);

  let rawBody: string;
  try {
    rawBody = await readSmallBody(request, 1024);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "Request body exceeds the allowed size.";
    return json({ error: tooLarge ? error.message : "Invalid request body." }, tooLarge ? 413 : 400, appOrigin);
  }
  let body: { confirm?: string };
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "Invalid request body." }, 400, appOrigin);
    body = parsed as { confirm?: string };
  } catch {
    return json({ error: "Invalid request body." }, 400, appOrigin);
  }
  if (body.confirm !== "DELETE_MY_ACCOUNT") return json({ error: "Explicit deletion confirmation is required." }, 400, appOrigin);

  const authHeaders = { apikey: anonKey, Authorization: `Bearer ${token}` };
  const identityResponse = await fetch(`${base}/auth/v1/user`, { headers: authHeaders });
  if (!identityResponse.ok) return json({ error: "The signed-in session could not be verified." }, 401, appOrigin);
  const user = await identityResponse.json().catch(() => null);
  if (!user?.id || !/^[0-9a-f-]{36}$/i.test(user.id)) return json({ error: "The signed-in identity is invalid." }, 401, appOrigin);

  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const bucket = "journal-attachments";
  const paths: string[] = [];
  const visited = new Set<string>();

  async function collect(prefix: string, depth: number): Promise<void> {
    if (depth > 24 || visited.has(prefix)) throw new Error("Attachment folder structure could not be safely traversed.");
    visited.add(prefix);
    for (let offset = 0; ; offset += 100) {
      const response = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!response.ok) throw new Error("Private attachments could not be listed; account deletion stopped.");
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("Private attachment listing returned an invalid response.");
      for (const entry of entries) {
        const path = `${prefix}/${String(entry.name || "")}`;
        if (!entry.name || !path.startsWith(`${user.id}/`)) throw new Error("An attachment path failed its owner check.");
        if (entry.id === null) await collect(path, depth + 1);
        else if (entry.id) paths.push(path);
        else throw new Error("An attachment could not be safely classified.");
      }
      if (entries.length < 100) break;
    }
  }

  try {
    await collect(user.id, 0);
    for (let i = 0; i < paths.length; i += 100) {
      const response = await fetch(`${base}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: adminHeaders,
        body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }),
      });
      if (!response.ok) throw new Error("Private attachments could not be deleted; account deletion stopped.");
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Private attachments could not be safely removed." }, 502, appOrigin);
  }

  const deletion = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  if (!deletion.ok) return json({ error: "The account could not be deleted after attachment cleanup. Contact support before retrying." }, 502, appOrigin);
  return json({ deleted: true }, 200, appOrigin);
});
