"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettingsStore, ProviderInfo } from "@/lib/stores/settingsStore";
import { api } from "@/lib/api/client";

// Provider metadata for display
const PROVIDER_META: Record<
  string,
  { icon: string; placeholder: string; helpUrl: string }
> = {
  anthropic: {
    icon: "A",
    placeholder: "sk-ant-api03-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    icon: "O",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
  },
  openrouter: {
    icon: "R",
    placeholder: "sk-or-v1-...",
    helpUrl: "https://openrouter.ai/keys",
  },
  gemini: {
    icon: "G",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
  },
  kimi: {
    icon: "K",
    placeholder: "sk-...",
    helpUrl: "https://platform.moonshot.cn/console/api-keys",
  },
};

export default function SettingsPage() {
  const {
    mode,
    apiKeys,
    localUrl,
    provider: selectedProvider,
    model: selectedModel,
    providers,
    setMode,
    setApiKey,
    removeApiKey,
    setProvider,
    setModel,
    setLocalUrl,
    setProviders,
    getActiveApiKeys,
    getLocalUrl,
  } = useSettingsStore();

  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<
    Record<string, { valid: boolean; error?: string }>
  >({});

  // Local AI form state
  const [localUrlInput, setLocalUrlInput] = useState(localUrl);
  const [localModelInput, setLocalModelInput] = useState(
    mode === "local" ? selectedModel : ""
  );
  const [localKeyInput, setLocalKeyInput] = useState(apiKeys["local"] || "");

  // Custom model input for cloud mode
  const [customModelInput, setCustomModelInput] = useState("");
  const [showCustomModel, setShowCustomModel] = useState(false);

  // Dynamic model fetching
  const [dynamicModels, setDynamicModels] = useState<string[]>([]);
  const [modelsSource, setModelsSource] = useState<string>("fallback");
  const [loadingModels, setLoadingModels] = useState(false);

  // Load providers on mount and when keys change
  const loadProviders = useCallback(async () => {
    try {
      const result = await api.getProvidersWithKeys(getActiveApiKeys());
      setProviders(result.providers);
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  }, [getActiveApiKeys, setProviders]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Fetch models dynamically when provider changes or key becomes available
  const fetchModelsForProvider = useCallback(
    async (providerId: string) => {
      if (providerId === "local") return; // Local mode uses text input
      setLoadingModels(true);
      try {
        const key = apiKeys[providerId];
        const result = await api.fetchModels(
          providerId,
          key || undefined,
          undefined
        );
        setDynamicModels(result.models);
        setModelsSource(result.source);
      } catch {
        setDynamicModels([]);
        setModelsSource("fallback");
      } finally {
        setLoadingModels(false);
      }
    },
    [apiKeys]
  );

  useEffect(() => {
    if (mode === "cloud") {
      fetchModelsForProvider(selectedProvider);
    }
  }, [selectedProvider, fetchModelsForProvider, mode]);

  // Initialize key inputs from stored keys
  useEffect(() => {
    setKeyInputs({ ...apiKeys });
  }, [apiKeys]);

  // Sync local inputs when store changes
  useEffect(() => {
    setLocalUrlInput(localUrl);
    setLocalKeyInput(apiKeys["local"] || "");
  }, [localUrl, apiKeys]);

  // Sync local model input when switching to local mode
  useEffect(() => {
    if (mode === "local") {
      setLocalModelInput(selectedModel);
    }
  }, [mode, selectedModel]);

  const handleSaveKey = async (providerId: string) => {
    const key = keyInputs[providerId]?.trim();
    if (!key) {
      removeApiKey(providerId);
      setValidationResults((prev) => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
      loadProviders();
      return;
    }

    setValidating(providerId);
    try {
      const result = await api.validateApiKey(providerId, key);
      setValidationResults((prev) => ({ ...prev, [providerId]: result }));

      if (result.valid) {
        setApiKey(providerId, key);
        loadProviders();
        // Refresh model list if this is the currently selected provider
        if (providerId === selectedProvider) {
          setTimeout(() => fetchModelsForProvider(providerId), 100);
        }
      }
    } catch {
      setValidationResults((prev) => ({
        ...prev,
        [providerId]: {
          valid: false,
          error: "Failed to validate — is the backend running?",
        },
      }));
    } finally {
      setValidating(null);
    }
  };

  const handleRemoveKey = (providerId: string) => {
    removeApiKey(providerId);
    setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
    setValidationResults((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
    loadProviders();
  };

  const handleSaveLocal = async () => {
    const url = localUrlInput.trim();
    if (!url) return;

    setValidating("local");
    try {
      const result = await api.validateApiKey(
        "local",
        localKeyInput.trim() || "not-needed",
        url
      );
      setValidationResults((prev) => ({ ...prev, local: result }));

      if (result.valid) {
        setLocalUrl(url);
        setModel(localModelInput.trim());
        if (localKeyInput.trim()) {
          setApiKey("local", localKeyInput.trim());
        }
        loadProviders();
      }
    } catch {
      setValidationResults((prev) => ({
        ...prev,
        local: {
          valid: false,
          error: "Failed to connect — is the backend running?",
        },
      }));
    } finally {
      setValidating(null);
    }
  };

  const handleRemoveLocal = () => {
    setLocalUrl("");
    setModel("");
    removeApiKey("local");
    setLocalUrlInput("");
    setLocalModelInput("");
    setLocalKeyInput("");
    setValidationResults((prev) => {
      const next = { ...prev };
      delete next["local"];
      return next;
    });
    loadProviders();
  };

  const currentProviderInfo = providers.find((p) => p.id === selectedProvider);
  // Use dynamically fetched models if available, otherwise fall back to provider info
  const models =
    dynamicModels.length > 0
      ? dynamicModels
      : currentProviderInfo?.models || [];

  // Determine actual selected model for cloud mode
  const effectiveModel =
    selectedModel || currentProviderInfo?.default_model || "";

  const handleModelChange = (value: string) => {
    if (value === "__custom__") {
      setShowCustomModel(true);
      setCustomModelInput("");
    } else {
      setShowCustomModel(false);
      setModel(value);
    }
  };

  const handleCustomModelConfirm = () => {
    const m = customModelInput.trim();
    if (!m) return;
    setModel(m);
    setShowCustomModel(false);
  };

  const isLocalDirty =
    localUrlInput !== localUrl ||
    localModelInput !== (mode === "local" ? selectedModel : "") ||
    localKeyInput !== (apiKeys["local"] || "");

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold gradient-text mb-2">AI Settings</h1>
      <p className="text-white/50 text-sm mb-8">
        Configure your AI provider and API keys. Keys are stored locally in your
        browser — they never touch our servers.
      </p>

      {/* Mode Toggle */}
      <div className="glass rounded-2xl p-1.5 mb-6 inline-flex">
        <button
          onClick={() => setMode("cloud")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            mode === "cloud"
              ? "bg-white/10 text-white shadow-lg"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            Cloud LLM
          </span>
        </button>
        <button
          onClick={() => setMode("local")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            mode === "local"
              ? "bg-white/10 text-white shadow-lg"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Local LLM
          </span>
        </button>
      </div>

      {/* ─── Cloud LLM Mode ─── */}
      {mode === "cloud" && (
        <>
          {/* Provider & Model Selection */}
          <section className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Provider & Model
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="glass-select w-full"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.available ? "" : " (no key)"}
                    </option>
                  ))}
                  {providers.length === 0 && (
                    <option value="anthropic">Claude (Anthropic)</option>
                  )}
                </select>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="block text-sm text-white/60">Model</label>
                  {loadingModels && (
                    <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  )}
                  {!loadingModels && modelsSource === "api" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400/70">
                      Live
                    </span>
                  )}
                  {!loadingModels && models.length > 0 && (
                    <button
                      onClick={() => fetchModelsForProvider(selectedProvider)}
                      className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                      title="Refresh model list"
                    >
                      Refresh
                    </button>
                  )}
                </div>
                {showCustomModel ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCustomModelConfirm()
                      }
                      placeholder="Enter model name..."
                      className="glass-input flex-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleCustomModelConfirm}
                      className="glass-btn-primary px-3 text-xs"
                    >
                      Set
                    </button>
                    <button
                      onClick={() => setShowCustomModel(false)}
                      className="glass-btn-secondary px-3 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={effectiveModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="glass-select w-full"
                    >
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                          {m === currentProviderInfo?.default_model
                            ? " (default)"
                            : ""}
                        </option>
                      ))}
                      {/* Show currently selected model if not in the list */}
                      {effectiveModel && !models.includes(effectiveModel) && (
                        <option value={effectiveModel}>
                          {effectiveModel} (custom)
                        </option>
                      )}
                      {models.length === 0 && !effectiveModel && (
                        <option value="">Select a provider first</option>
                      )}
                    </select>
                    <button
                      onClick={() => {
                        setShowCustomModel(true);
                        setCustomModelInput("");
                      }}
                      className="mt-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                    >
                      Can&apos;t find your model? Enter manually
                    </button>
                  </>
                )}
              </div>
            </div>
            {currentProviderInfo && !currentProviderInfo.available && (
              <p className="mt-3 text-sm text-amber-400/80">
                This provider has no API key configured. Add one below to use
                it.
              </p>
            )}
          </section>

          {/* Cloud API Keys */}
          <section className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-1">
              API Keys
            </h2>
            <p className="text-xs text-white/40 mb-5">
              Add keys for the cloud providers you want to use. Each key is
              validated before saving.
            </p>

            <div className="space-y-5">
              {providers.map((p) => {
                const meta = PROVIDER_META[p.id] || {
                  icon: "?",
                  placeholder: "...",
                  helpUrl: "#",
                };
                const hasStoredKey = !!apiKeys[p.id];
                const isValidating = validating === p.id;
                const result = validationResults[p.id];
                const inputValue = keyInputs[p.id] || "";
                const isDirty = inputValue !== (apiKeys[p.id] || "");

                return (
                  <div key={p.id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                          {meta.icon}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {p.name}
                        </span>
                        {hasStoredKey && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>
                      <a
                        href={meta.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-400/60 hover:text-sky-400 transition-colors"
                      >
                        Get API key ↗
                      </a>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[p.id] ? "text" : "password"}
                          value={inputValue}
                          onChange={(e) =>
                            setKeyInputs((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          placeholder={meta.placeholder}
                          className="glass-input w-full pr-10 font-mono text-xs"
                        />
                        <button
                          onClick={() =>
                            setShowKeys((prev) => ({
                              ...prev,
                              [p.id]: !prev[p.id],
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
                          type="button"
                          aria-label={showKeys[p.id] ? "Hide key" : "Show key"}
                        >
                          {showKeys[p.id] ? (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>

                      {isDirty && (
                        <button
                          onClick={() => handleSaveKey(p.id)}
                          disabled={isValidating}
                          className="glass-btn-primary px-4 text-xs whitespace-nowrap disabled:opacity-50"
                        >
                          {isValidating ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Validating
                            </span>
                          ) : (
                            "Save & Validate"
                          )}
                        </button>
                      )}

                      {hasStoredKey && !isDirty && (
                        <button
                          onClick={() => handleRemoveKey(p.id)}
                          className="glass-btn-secondary px-3 text-xs text-red-400/70 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {result && !isDirty && (
                      <p
                        className={`mt-1.5 text-xs ${
                          result.valid
                            ? "text-emerald-400/80"
                            : "text-red-400/80"
                        }`}
                      >
                        {result.valid
                          ? "Key validated successfully"
                          : result.error || "Invalid key"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ─── Local LLM Mode ─── */}
      {mode === "local" && (
        <section className="glass rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
              L
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Local AI Server
              </h2>
              <p className="text-xs text-white/40">
                Ollama, LM Studio, vLLM, text-generation-webui, or any
                OpenAI-compatible server
              </p>
            </div>
            {localUrl && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Configured
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Server URL */}
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Server URL
              </label>
              <input
                type="text"
                value={localUrlInput}
                onChange={(e) => setLocalUrlInput(e.target.value)}
                placeholder="http://127.0.0.1:8317"
                className="glass-input w-full text-sm font-mono"
              />
              <p className="mt-1 text-xs text-white/30">
                CLIProxyAPI:{" "}
                <code className="text-white/50">
                  http://127.0.0.1:8317
                </code>{" "}
                Ollama:{" "}
                <code className="text-white/50">
                  http://localhost:11434
                </code>{" "}
                LM Studio:{" "}
                <code className="text-white/50">
                  http://localhost:1234
                </code>
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs text-white/50 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={localModelInput}
                onChange={(e) => setLocalModelInput(e.target.value)}
                placeholder="llama3"
                className="glass-input w-full text-sm font-mono"
              />
              <p className="mt-1 text-xs text-white/30">
                The model name as shown by your server (e.g.{" "}
                <code className="text-white/50">llama3</code>,{" "}
                <code className="text-white/50">mistral:7b-instruct</code>,{" "}
                <code className="text-white/50">deepseek-r1:14b</code>)
              </p>
            </div>

            {/* API Key (optional) */}
            <div>
              <label className="block text-xs text-white/50 mb-1">
                API Key{" "}
                <span className="text-white/20">
                  (optional — most local servers don&apos;t need one)
                </span>
              </label>
              <input
                type="password"
                value={localKeyInput}
                onChange={(e) => setLocalKeyInput(e.target.value)}
                placeholder="Leave empty if not required"
                className="glass-input w-full text-sm font-mono"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              {isLocalDirty && localUrlInput.trim() && (
                <button
                  onClick={handleSaveLocal}
                  disabled={validating === "local"}
                  className="glass-btn-primary px-4 py-2 text-xs"
                >
                  {validating === "local" ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Testing connection
                    </span>
                  ) : (
                    "Save & Test Connection"
                  )}
                </button>
              )}
              {localUrl && !isLocalDirty && (
                <button
                  onClick={handleRemoveLocal}
                  className="glass-btn-secondary px-3 py-2 text-xs text-red-400/70 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Validation result */}
            {validationResults["local"] && !isLocalDirty && (
              <p
                className={`text-xs ${
                  validationResults["local"].valid
                    ? "text-emerald-400/80"
                    : "text-red-400/80"
                }`}
              >
                {validationResults["local"].valid
                  ? "Connected successfully"
                  : validationResults["local"].error || "Connection failed"}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Info note */}
      <div className="mt-6 glass rounded-xl p-4 border border-sky-500/10">
        <div className="flex gap-3">
          <span className="text-sky-400/60 mt-0.5">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div className="text-xs text-white/40 leading-relaxed">
            <p className="mb-1">
              <strong className="text-white/60">Privacy:</strong> API keys and
              local server URLs are stored in your browser&apos;s localStorage
              and sent directly with each request. They are never stored on the
              server.
            </p>
            {mode === "cloud" && (
              <p>
                <strong className="text-white/60">Models:</strong> Model lists
                are fetched live from each provider when you have a valid API
                key. Look for the green &quot;Live&quot; badge.
              </p>
            )}
            {mode === "local" && (
              <p>
                <strong className="text-white/60">Local AI:</strong> Any server
                that exposes an OpenAI-compatible{" "}
                <code>/v1/chat/completions</code> endpoint works. Ollama, LM
                Studio, vLLM, and text-generation-webui all support this.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
