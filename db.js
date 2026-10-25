/* Base de données locale (IndexedDB) : 3 « fichiers » = 3 tables */
const DB = (() => {
  let db;
  const STORES = { etudiants: 'id', cours: 'code', presences: 'id' };

  const open = () => new Promise((ok, ko) => {
    const r = indexedDB.open('presence_classe_db', 1);
    r.onupgradeneeded = () => {
      for (const s in STORES) r.result.createObjectStore(s, { keyPath: STORES[s] });
    };
    r.onsuccess = () => { db = r.result; ok(); };
    r.onerror = () => ko(r.error);
  });

  const tx = (s, mode, fn) => new Promise((ok, ko) => {
    const t = db.transaction(s, mode);
    const q = fn(t.objectStore(s));
    t.oncomplete = () => ok(q.result);
    t.onerror = () => ko(t.error);
  });

  return {
    open,
    all: s => tx(s, 'readonly', o => o.getAll()),
    get: (s, k) => tx(s, 'readonly', o => o.get(k)),
    put: (s, v) => tx(s, 'readwrite', o => o.put(v)),
    del: (s, k) => tx(s, 'readwrite', o => o.delete(k))
  };
})();
