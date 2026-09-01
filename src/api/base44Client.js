// KosovoScores V2 - Self-hosted, pa Base44

export const base44 = {
  entities: new Proxy({}, {
    get: (target, entityName) => ({
      list: async () => {
        console.log(`Mock ${String(entityName)}.list() - kthej []`);
        return [];
      },
      get: async () => null,
      create: async (data) => ({ id: Date.now().toString(), ...data }),
      update: async (id, data) => ({ id, ...data }),
      delete: async () => true,
      filter: async () => [],
    })
  }),
  auth: {
    me: async () => null,
    isAuthenticated: false,
    login: async () => null,
    logout: async () => null,
  },
  functions: new Proxy({}, {
    get: () => async () => ({ data: null, error: null })
  }),
  integrations: {
    Core: {
      InvokeLLM: async () => ({ response: "" }),
      SendEmail: async () => true,
      UploadFile: async () => ({ file_url: "" }),
      GenerateImage: async () => ({ url: "" }),
      ExtractDataFromUploadedFile: async () => ({}),
    }
  }
};