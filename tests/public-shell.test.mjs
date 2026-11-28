import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const origin = 'https://example.test';
const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function worker() {
  const listeners = new Map();
  const oldName = 'fios-shell-v1.1.0-public-shell';
  const stores = new Map([[oldName, new Map([['/account/', new Response('old private response')]])]]);
  let offline = false;
  runInNewContext(source, {
    URL, Response,
    self: {
      location: { origin }, registration: { scope: origin + '/' },
      addEventListener: (name, fn) => listeners.set(name, fn),
      skipWaiting: async () => {}, clients: { claim: async () => {} },
    },
    caches: {
      keys: async () => [...stores.keys()],
      delete: async name => stores.delete(name),
      open: async name => {
        if (!stores.has(name)) stores.set(name, new Map());
        const entries = stores.get(name);
        return {
          put: async (path, response) => entries.set(path, response),
          match: async path => entries.get(path)?.clone(),
        };
      },
    },
    fetch: async (request, options) => {
      if (offline) throw new Error('offline');
      if (typeof request === 'string') assert.equal(options.credentials, 'omit');
      return new Response(typeof request === 'string' ? request : 'network');
    },
  });
  return {
    oldName, stores, disconnect: () => { offline = true; },
    lifecycle: name => new Promise(resolve => listeners.get(name)({ waitUntil: resolve })),
    request(path, mode = 'navigate', method = 'GET') {
      let result;
      listeners.get('fetch')({
        request: { url: new URL(path, origin).href, method, mode },
        respondWith: response => { result = response; },
      });
      return result;
    },
  };
}

test('public shell replaces stale caches and leaves private routes and terminal redirects to the network', async () => {
  const sw = worker();
  await sw.lifecycle('install');
  await sw.lifecycle('activate');
  assert.equal(sw.stores.has(sw.oldName), false);
  assert.equal(await (await sw.request('/')).text(), 'network');
  for (const path of ['/account/', '/api/private', '/ict-futures/', '/ict-lab/?view=learn', '/?token=fixture',
    'https://provider.test/']) assert.equal(sw.request(path), undefined, path);
  assert.equal(sw.request('/', 'navigate', 'POST'), undefined);
  sw.disconnect();
  assert.equal(await (await sw.request('/')).text(), '/');
  assert.equal(await (await sw.request('/index.html')).text(), '/');
  assert.equal(await (await sw.request('/icon.svg', 'no-cors')).text(), '/icon.svg');
  assert.equal(sw.request('/account/'), undefined);
});

test('a first install without network does not serve a stale navigation', async () => {
  const sw = worker();
  sw.disconnect();
  await sw.lifecycle('install');
  assert.equal((await sw.request('/')).type, 'error');
});

