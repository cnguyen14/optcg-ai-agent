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

  setContext: (deckId, page) => {
    const state = get();
    if (state.conversationId && state.currentDeckId !== deckId) {
      // Deck changed — reset conversation so the new one picks up fresh context
      set({
        currentDeckId: deckId,
        currentPage: page,
        conversationId: null,
        messages: [],
        streamingText: "",
        currentThinking: [],
        currentToolUse: null,
      });
    } else {
      set({ currentDeckId: deckId, currentPage: page });
    }
  },

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
        const allKeys = settings.getActiveApiKeys();
        const { local: _localKey, ...cloudKeys } = allKeys;
        apiKeys = Object.keys(cloudKeys).length > 0 ? cloudKeys : undefined;
      }

      // Add user message to local state immediately
      const convId = state.conversationId;
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: convId || "",
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, userMsg] }));

      // Build AG-UI request
      const agUIBody = {
        thread_id: convId || undefined,
        run_id: crypto.randomUUID(),
        messages: [
          ...state.messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content },
        ],
        state: {
          provider,
          model,
          api_keys: apiKeys,
          local_url: isLocal && localUrl ? localUrl : undefined,
          deck_id: state.currentDeckId || undefined,
        },
        context: state.currentPage
          ? [{ type: "page", value: state.currentPage }]
          : [],
      };

      const url = api.getAGUIEndpointUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agUIBody),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `HTTP ${response.status}`);
      }

      // Capture thread_id from response header (new conversation)
      const threadId = response.headers.get("X-Thread-Id");
      if (threadId && !convId) {
        set({ conversationId: threadId });
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let toolArgs = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (!raw || raw === "[DONE]") continue;

          try {
            const evt = JSON.parse(raw);
            const eventType: string = evt.type;

            switch (eventType) {
              case "TEXT_MESSAGE_CONTENT":
                fullText += evt.delta;
                set({ streamingText: fullText });
                break;

              case "TOOL_CALL_START":
                toolArgs = "";
                set({
                  currentToolUse: {
                    tool: evt.toolCallName,
                    args: {},
                  },
                });
                break;

              case "TOOL_CALL_ARGS":
                toolArgs += evt.delta || "";
                try {
                  const parsed = JSON.parse(toolArgs);
                  set((s) => ({
                    currentToolUse: s.currentToolUse
                      ? { ...s.currentToolUse, args: parsed }
                      : null,
                  }));
                } catch {
                  // args still incomplete JSON — wait for more
                }
                break;

              case "TOOL_CALL_END":
                break;

              case "TOOL_CALL_RESULT":
                set({ currentToolUse: null });
                break;

              case "CUSTOM":
                if (evt.name === "thinking" && evt.value?.thoughts) {
                  set({ currentThinking: evt.value.thoughts });
                }
                break;

              case "STATE_SNAPSHOT":
                // Could sync local state with agent state
                break;

              case "RUN_ERROR":
                console.error("Agent error:", evt.message);
                break;

              case "TEXT_MESSAGE_START":
              case "TEXT_MESSAGE_END":
              case "RUN_STARTED":
              case "RUN_FINISHED":
                break;
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      // Add assistant message to local state
      const finalConvId = get().conversationId || threadId || "";
      if (fullText) {
        const assistantMsg: ChatMessage = {
          id: `temp-${Date.now()}-assistant`,
          conversation_id: finalConvId,
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
