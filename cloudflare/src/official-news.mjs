const fedFeed = "https://www.federalreserve.gov/feeds/press_monetary.xml";
const maxBytes = 256 * 1024;
const maxAge = 24 * 60 * 60 * 1000;
const refreshAge = 4 * 60 * 60 * 1000;
const key = "news:official:fed-monetary:v1";

function decodeText(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(
    /&(amp|lt|gt|quot|apos|#\d{1,7}|#x[\da-f]{1,6});/gi,
    (match, entity) => {
      const named = {amp:"&",lt:"<",gt:">",quot:'"',apos:"'"};
      if (entity[0] !== "#") return named[entity] || match;
      const point = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2),16) : Number(entity.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    }
  ).trim();
}

export function parseFedMonetaryRss(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported RSS declaration");
  const body = xml.trim().replace(/^<\?xml[^?]*\?>\s*/i,"");
  const channel = /^<rss\b[^>]*>\s*<channel\b[^>]*>([\s\S]*?)<\/channel>\s*<\/rss>$/i.exec(body)?.[1];
  if (channel === undefined) throw new Error("Invalid RSS envelope");
  const items = [...channel.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  if ((channel.match(/<\/?item(?=[\s>])/gi)||[]).length !== items.length*2) throw new Error("Unbalanced RSS items");
  const unique = new Map();
  for (const [,item] of items) {
    const field = name => {
      const raw = new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+name+">","i").exec(item)?.[1] || "";
      return decodeText(raw);
    };
    const title = field("title").slice(0,280);
    let url;
    try { url = new URL(field("link")); } catch { continue; }
    if (!title || url.origin !== "https://www.federalreserve.gov" || url.username || url.password ||
        !/^\/newsevents\/pressreleases\/monetary[\da-z-]+\.htm$/i.test(url.pathname)) continue;
    url.search = "";
    url.hash = "";
    const published = Date.parse(field("pubDate"));
    if (!unique.has(url.href)) unique.set(url.href, {
      title, url:url.href, publisher:"Federal Reserve Board", topic:"Monetary policy",
      published_at:Number.isFinite(published)?new Date(published).toISOString():null
    });
  }
  return [...unique.values()].sort((a,b)=>(b.published_at||"").localeCompare(a.published_at||"")).slice(0,20);
}

async function readFeed(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("RSS body unavailable");
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  for (;;) {
    const {done,value} = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new Error("RSS body exceeds the limit");
    }
    text += decoder.decode(value,{stream:true});
  }
}

export async function refreshOfficialNews(storage, fetchImpl = fetch, now = Date.now()) {
  if (!storage) return;
  const existing = await storage.get(key,"json");
  if (now - Date.parse(existing?.retrieved_at || "") < refreshAge) return;
  const response = await fetchImpl(fedFeed,{
    redirect:"error",signal:AbortSignal.timeout(10000),headers:{Accept:"application/rss+xml, application/xml, text/xml"}
  });
  if (!response.ok) throw new Error("Official RSS unavailable");
  const releases = parseFedMonetaryRss(await readFeed(response));
  await storage.put(key,JSON.stringify({retrieved_at:new Date(now).toISOString(),releases}),{expirationTtl:maxAge/1000});
}

export async function officialNewsSnapshot(storage, now = Date.now()) {
  const snapshot = storage ? await storage.get(key,"json") : null;
  const age = now-Date.parse(snapshot?.retrieved_at||"");
  const usable = age >= 0 && age < maxAge && Array.isArray(snapshot?.releases);
  return {
    status:usable?(age<refreshAge?"fresh":"stale"):storage?"not-yet-fetched":"not-configured",
    retrieved_at:usable?snapshot.retrieved_at:null,
    releases:usable?snapshot.releases:[],
    source_url:fedFeed
  };
}
