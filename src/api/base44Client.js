// KosovoScores - REAL DATA nga Base44 export - 1049 ndeshje
const DATA_CACHE = {};

async function loadData(entityName) {
  if (DATA_CACHE[entityName]) return DATA_CACHE[entityName];
  try {
    const res = await fetch(`/data/${entityName}.json`);
    if (!res.ok) {
      console.warn(`Nuk u gjet /data/${entityName}.json`);
      return [];
    }
    const data = await res.json();
    DATA_CACHE[entityName] = data;
    console.log(`✅ REAL DATA: ${entityName} - ${data.length} records`);
    return data;
  } catch (e) {
    console.error(`Gabim duke ngarkuar ${entityName}:`, e);
    return [];
  }
}

function sortData(data, sortBy) {
  if (!sortBy) return data;
  try {
    const field = sortBy.replace("-", "");
    const desc = sortBy.startsWith("-");
    return [...data].sort((a, b) => {
      if (a[field] < b[field]) return desc? 1 : -1;
      if (a[field] > b[field]) return desc? -1 : 1;
      return 0;
    });
  } catch { return data; }
}

export const base44 = {
  entities: new Proxy({}, {
    get: (target, entityName) => ({
      list: async (sort) => {
        const data = await loadData(entityName);
        return sortData(data, sort);
      },
      get: async (id) => {
        const data = await loadData(entityName);
        return data.find(d => d.id === id || d.id == id) || null;
      },
      filter: async (filters = {}, sort, limit) => {
        let data = await loadData(entityName);
        for (let k in filters) {
          data = data.filter(d => d[k] == filters[k] || String(d[k]) == String(filters[k]));
        }
        data = sortData(data, sort);
        if (limit) data = data.slice(0, limit);
        return data;
      },
      create: async (d) => ({ id: Date.now().toString(),...d }),
      update: async (id, d) => ({ id,...d }),
      delete: async () => true,
      subscribe: (cb) => {
        loadData(entityName).then(data => cb(data));
        return () => {};
      },
    })
  }),
  auth: { me: async () => null, isAuthenticated: false, login: async () => null, logout: async () => null },
  functions: new Proxy({}, { get: () => async () => ({ data: null, error: null }) }),
  integrations: { Core: { InvokeLLM: async () => ({ response: "" }), SendEmail: async () => true, UploadFile: async () => ({ file_url: "" }), GenerateImage: async () => ({ url: "" }), ExtractDataFromUploadedFile: async () => ({}) } }
};
