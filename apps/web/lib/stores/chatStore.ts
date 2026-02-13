import { create } from "zustand";
import { ChatMessage } from "@/types";
import { api } from "@/lib/api/client";
import { useSettingsStore } from "@/lib/stores/settingsStore";

interface ChatState {
  // UI state
  isOpen: boolean;
  isExpanded: boolean;

  // Conversation state
  conversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;

  // Streaming indicators
  currentThinking: string[];
  currentToolUse: { tool: string; args?: Record<string, unknown> } | null;
  streamingText: string;

  // Context
  currentDeckId: string | null;
  currentPage: string | null;

  // Actions
  toggleOpen: () => void;
  toggleExpanded: () => void;
  setContext: (deckId: string | null, page: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isExpanded: false,
  conversationId: null,
  messages: [],
  isStreaming: false,
  currentThinking: [],
  currentToolUse: null,
  streamingText: "",
  currentDeckId: null,
  currentPage: null,

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),

  setContext: (deckId, page) =>
    set({ currentDeckId: deckId, currentPage: page }),

  clearChat: () =>
    set({
      conversationId: null,
      messages: [],
      currentThinking: [],
      currentToolUse: null,
      streamingText: "",
    }),

  loadConversation: async (conversationId: string) => {
    try {
      const conv = await api.getConversation(conversationId);
      set({
        conversationId,
        messages: conv.messages || [],
      });
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  },

  sendMessage: async (content: string) => {
    const state = get();
    if (state.isStreaming) return;

    set({ isStreaming: true, currentThinking: [], currentToolUse: null, streamingText: "" });

    try {
      // Read settings — mode determines provider/model/keys
      const settings = useSettingsStore.getState();
      const isLocal = settings.mode === "local";

      let provider: string | undefined;
      let model: string | undefined;
      let apiKeys: Record<string, string> | undefined;
      let localUrl: string | undefined;

      if (isLocal) {
        provider = "local";
        model = settings.model || undefined;
        localUrl = settings.localUrl || undefined;
        const localKey = settings.apiKeys["local"];
        apiKeys = localKey ? { local: localKey } : undefined;
      } else {
        provider = settings.provider || undefined;
        model = settings.model || undefined;
        // Filter out local key from cloud requests
        const allKeys = settings.getActiveApiKeys();
        const { local: _localKey, ...cloudKeys } = allKeys;
        apiKeys = Object.keys(cloudKeys).length > 0 ? cloudKeys : undefined;
      }

      // Create conversation if needed
      let convId = state.conversationId;
      if (!convId) {
        const context: Record<string, unknown> = {};
        if (state.currentDeckId) context.deck_id = state.currentDeckId;
        if (state.currentPage) context.page = state.currentPage;

        const conv = await api.createConversation({
          context,
          provider,
          model,
        });
        convId = conv.id;
        set({ conversationId: convId });
      }

      // Add user message to local state immediately
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, userMsg] }));

      // Stream response via SSE (include user settings)
      const url = api.getMessageStreamUrl(convId);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          provider,
          model,
          api_keys: apiKeys,
          local_url: isLocal && localUrl ? localUrl : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            // SSE event type — next data line will have the payload
            continue;
          }
          if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            if (!raw || raw === "[DONE]") continue;

            try {
              const payload = JSON.parse(raw);

              // Determine event type from payload or previous event line
              // sse-starlette sends "event: X\ndata: Y\n\n" format
              // We parse the data and check what it contains
              if (payload.thoughts) {
                set({ currentThinking: payload.thoughts });
              } else if (payload.tool && payload.args) {
                set({ currentToolUse: { tool: payload.tool, args: payload.args } });
              } else if (payload.tool && payload.result) {
                set({ currentToolUse: null });
              } else if (payload.text !== undefined) {
                fullText += payload.text;
                set({ streamingText: fullText });
              } else if (payload.full_text !== undefined) {
                fullText = payload.full_text;
              } else if (payload.detail) {
                console.error("SSE error:", payload.detail);
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Add assistant message to local state
      if (fullText) {
        const assistantMsg: ChatMessage = {
          id: `temp-${Date.now()}-assistant`,
          conversation_id: convId,
          role: "assistant",
          content: fullText,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          streamingText: "",
          currentThinking: [],
          currentToolUse: null,
        }));
      }
    } catch (err) {
      console.error("Chat error:", err);
      // Add error as a local message
      const errorMsg: ChatMessage = {
        id: `temp-error-${Date.now()}`,
        conversation_id: get().conversationId || "",
        role: "assistant",
        content: `Sorry, an error occurred: ${err instanceof Error ? err.message : "Unknown error"}`,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, errorMsg] }));
    } finally {
      set({ isStreaming: false });
    }
  },
}));
