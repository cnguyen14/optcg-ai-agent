import { create } from "zustand";
import { ChatMessage, ActivityEntry } from "@/types";
import { api } from "@/lib/api/client";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useDeckBuilder } from "@/lib/stores/deckBuilderStore";

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
  activityLog: ActivityEntry[];

  // Context
  currentDeckId: string | null;
  currentPage: string | null;

  // Actions
  toggleOpen: () => void;
  toggleExpanded: () => void;
  setContext: (deckId: string | null, page: string | null, skipAutoLoad?: boolean) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
}

const TOOL_LABELS: Record<string, string> = {
  query_data: "Searching & analyzing",
  modify_deck: "Modifying deck",
  response: "Preparing response",
};

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

async function handleDeckAction(
  action: {
    action: string;
    leader?: Record<string, unknown>;
    cards?: Array<{ card: Record<string, unknown>; quantity: number }>;
    card_ids?: string[];
  },
  deckId: string | null
) {
  const db = useDeckBuilder.getState();

  // If the store doesn't have a deck loaded, load it from API first
  if (!db.deckId && deckId) {
    try {
      const deck = await api.getDeck(deckId);
      db.loadDeck(deck);
    } catch (e) {
      console.error("Failed to load deck for action:", e);
    }
  }

  switch (action.action) {
    case "set_leader":
      if (action.leader) db.setLeader(action.leader as any);
      break;
    case "add_cards":
      action.cards?.forEach((c) => db.addCard(c.card as any, c.quantity));
      break;
    case "remove_cards":
      action.card_ids?.forEach((id) => db.removeCard(id));
      break;
    case "batch_deck_update":
      for (const subAction of (action as any).actions || []) {
        await handleDeckAction(subAction, deckId);
      }
      break;
  }
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
  activityLog: [],
  currentDeckId: null,
  currentPage: null,

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),

  setContext: async (deckId, page, skipAutoLoad) => {
    const state = get();
    if (state.currentDeckId === deckId) {
      set({ currentPage: page });
      return;
    }
    // Deck changed — clear immediately
    set({
      currentDeckId: deckId,
      currentPage: page,
      conversationId: null,
      messages: [],
      streamingText: "",
      currentThinking: [],
      currentToolUse: null,
      activityLog: [],
    });
    // Restore previous conversation for this deck (unless caller will load one explicitly)
    if (deckId && !skipAutoLoad) {
      try {
        const conv = await api.getConversationByDeck(deckId);
        if (conv?.messages?.length) {
          set({ conversationId: conv.id, messages: conv.messages });
        }
      } catch {
        /* no previous conversation */
      }
    }
  },

  clearChat: () =>
    set({
      conversationId: null,
      messages: [],
      currentThinking: [],
      currentToolUse: null,
      streamingText: "",
      activityLog: [],
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

    set({ isStreaming: true, currentThinking: [], currentToolUse: null, streamingText: "", activityLog: [] });

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

      // Build deck builder state snapshot if on deck-builder page
      let deckBuilderState: Record<string, unknown> | undefined;
      if (state.currentPage === "deck-builder") {
        const db = useDeckBuilder.getState();
        deckBuilderState = {
          leader: db.leader
            ? { id: db.leader.id, name: db.leader.name, colors: db.leader.colors, life: db.leader.life }
            : null,
          total_cards: db.getTotalCards(),
          cards: db.cards.map((dc) => ({
            id: dc.card.id,
            name: dc.card.name,
            quantity: dc.quantity,
            cost: dc.card.cost,
            color: dc.card.color,
            type: dc.card.type,
          })),
        };
      }

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
          deck_builder_state: deckBuilderState,
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
                fullText = "";  // Discard intermediate reasoning text
                set((s) => ({
                  streamingText: "",
                  currentToolUse: {
                    tool: evt.toolCallName,
                    args: {},
                  },
                  activityLog: [
                    ...s.activityLog.map((e) =>
                      e.status === "active" ? { ...e, status: "done" as const } : e
                    ),
                    {
                      id: `tool-${Date.now()}`,
                      type: "tool" as const,
                      label: getToolLabel(evt.toolCallName),
                      status: "active" as const,
                    },
                  ],
                }));
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
                set((s) => ({
                  currentToolUse: null,
                  activityLog: s.activityLog.map((e) =>
                    e.status === "active" ? { ...e, status: "done" as const } : e
                  ),
                }));
                break;

              case "CUSTOM":
                if (evt.name === "thinking" && evt.value?.thoughts) {
                  set({ currentThinking: evt.value.thoughts });
                }
                if (evt.name === "deck_action" && evt.value) {
                  await handleDeckAction(evt.value, get().currentDeckId);
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
