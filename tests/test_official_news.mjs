import test from "node:test";
import assert from "node:assert/strict";
import {parseFedMonetaryRss,refreshOfficialNews,officialNewsSnapshot} from "../cloudflare/src/official-news.mjs";

const url="https://www.federalreserve.gov/newsevents/pressreleases/monetary20990101a.htm";
const rss=items=>"<rss><channel>"+items+"</channel></rss>";
const release=(target,title="Policy &amp; statement")=>"<item><title>"+title+"</title><link>"+target+"</link></item>";
const now=Date.parse("2026-11-26T12:00:00Z");

test("official RSS handles tracking duplicates, source boundaries and missing publisher time",()=>{
 const rows=parseFedMonetaryRss(rss(release(url+"?utm_source=feed")+release(url+"#top")+release("https://example.com/other")+release(url.replace("https:","http:"))));
 assert.deepEqual(rows,[{title:"Policy & statement",url,publisher:"Federal Reserve Board",topic:"Monetary policy",published_at:null}]);
 assert.throws(()=>parseFedMonetaryRss(rss("<item><title>Incomplete</title>")),/Unbalanced/);
 assert.throws(()=>parseFedMonetaryRss("<!DOCTYPE rss>"+rss("")),/declaration/);
});

test("failed and oversized fetches leave the last permitted snapshot intact until expiry",async()=>{
 let cached;
 const storage={async get(){return cached},async put(_,value){cached=JSON.parse(value)}};
 await refreshOfficialNews(storage,async (source,init)=>{
  assert.match(source,/federalreserve\.gov\/feeds\/press_monetary\.xml$/);
  assert.equal(init.redirect,"error");
  return new Response(rss(release(url,"&lt;script&gt;plain text&lt;/script&gt;")));
 },now);
 await assert.rejects(refreshOfficialNews(storage,async()=>new Response("x".repeat(270000)),now+5*3600000),/exceeds/);
 const fallback=await officialNewsSnapshot(storage,now+5*3600000);
 assert.equal(fallback.status,"stale");
 assert.equal(fallback.releases[0].title,"<script>plain text</script>");
 assert.deepEqual((await officialNewsSnapshot(storage,now+86400000)).releases,[]);
});
