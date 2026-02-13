import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  default_model: string;
  models: string[];
}

interface SettingsState {
  // Mode: cloud or local LLM
  mode: "cloud" | "local";

  // API keys per provider (stored in localStorage)
  apiKeys: Record<string, string>;

  // Local AI config
  localUrl: string;

  // Selected provider & model
  provider: string;
  model: string;

  // Cached provider list
  providers: ProviderInfo[];

  // Actions
  setMode: (mode: "cloud" | "local") => void;
  setApiKey: (provider: string, key: string) => void;
  removeApiKey: (provider: string) => void;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setLocalUrl: (url: string) => void;
  setProviders: (providers: ProviderInfo[]) => void;
  getActiveApiKeys: () => Record<string, string>;
  getLocalUrl: () => string;
  hasAnyKey: () => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      mode: "cloud",
      apiKeys: {},
      localUrl: "",
      provider: "anthropic",
      model: "",
      providers: [],

      setMode: (mode) => set({ mode, model: "" }),

      setApiKey: (provider, key) =>
        set((s) => ({
          apiKeys: { ...s.apiKeys, [provider]: key },
        })),

      removeApiKey: (provider) =>
        set((s) => {
          const keys = { ...s.apiKeys };
          delete keys[provider];
          return { apiKeys: keys };
        }),

      setProvider: (provider) => set({ provider, model: "" }),

      setModel: (model) => set({ model }),

      setLocalUrl: (url) => set({ localUrl: url }),

      setProviders: (providers) => set({ providers }),

      getActiveApiKeys: () => {
        const { apiKeys } = get();
        const active: Record<string, string> = {};
        for (const [k, v] of Object.entries(apiKeys)) {
          if (v) active[k] = v;
        }
        return active;
      },

      getLocalUrl: () => get().localUrl,

      hasAnyKey: () => {
        const { apiKeys, localUrl } = get();
        return (
          Object.values(apiKeys).some((k) => k.length > 0) ||
          localUrl.length > 0
        );
      },
    }),
    {
      name: "optcg-ai-settings",
      partialize: (state) => ({
        mode: state.mode,
        apiKeys: state.apiKeys,
        localUrl: state.localUrl,
        provider: state.provider,
        model: state.model,
      }),
    }
  )
);
