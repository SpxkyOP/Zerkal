(function () {
  const STORAGE_KEY = 'tacmap.state.v1';
  const MAP_KEY = 'tacmap.mapImage.v1';
  const IDB_NAME = 'tacmap';
  const IDB_STORE = 'blobs';
  // ---- IndexedDB for large map images (localStorage caps ~5MB) ----
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbPut(key, val) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
  }
  async function idbGet(key) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const rq = tx.objectStore(IDB_STORE).get(key);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  }
  // ---- Map setup (CRS.Simple for image maps) ----
  const map = L.map('map', {
    loadMapImage(c.toDataURL('image/png'));
  }
  const savedMap = localStorage.getItem(MAP_KEY);
  if (savedMap) loadMapImage(savedMap); else loadDefault();
  (async () => {
    try {
      const blob = await idbGet(MAP_KEY);
      if (blob) { loadMapImage(URL.createObjectURL(blob)); return; }
    } catch (e) { console.warn('idb load failed', e); }
    const legacy = localStorage.getItem(MAP_KEY);
    if (legacy) loadMapImage(legacy); else loadDefault();
  })();
  // ---- Grid overlay ----
  function rebuildGrid() {
  });
  document.getElementById('file-map').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      try { localStorage.setItem(MAP_KEY, url); } catch (err) { console.warn('map too big to persist'); }
      loadMapImage(url);
    };
    r.readAsDataURL(f);
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(f.type)) { alert('Please upload a JPG or PNG image.'); return; }
    const url = URL.createObjectURL(f);
    loadMapImage(url);
    idbPut(MAP_KEY, f).catch((err) => {
      console.warn('idb persist failed, trying localStorage', err);
      const r = new FileReader();
      r.onload = () => { try { localStorage.setItem(MAP_KEY, r.result); } catch (e) { console.warn('map too big to persist'); } };
      r.readAsDataURL(f);
    });
    e.target.value = '';
  });
