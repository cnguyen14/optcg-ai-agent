import { Card, Leader, Deck, DeckCreateRequest, DeckUpdateRequest, Conversation, ConversationCreate, ChatMessage } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class APIClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Cards
  async getCards(params?: {
    search?: string;
    color?: string;
    type?: string;
    set_code?: string;
    limit?: number;
    offset?: number;
  }): Promise<Card[]> {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );

    return this.request<Card[]>(`/cards?${query}`);
  }

  async getCard(id: string): Promise<Card> {
    return this.request<Card>(`/cards/${id}`);
  }

  async getLeaders(params?: {
    search?: string;
    color?: string;
    set_code?: string;
    limit?: number;
    offset?: number;
  }): Promise<Leader[]> {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );

    return this.request<Leader[]>(`/cards/leaders/?${query}`);
  }

  async getLeader(id: string): Promise<Leader> {
    return this.request<Leader>(`/cards/leaders/${id}`);
  }

  async syncCards(): Promise<{ success: boolean; stats: any }> {
    return this.request("/cards/sync", { method: "POST" });
  }

  async getSets(): Promise<string[]> {
    return this.request<string[]>("/cards/sets/");
  }

  // Decks
  async getDecks(params?: {
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Deck[]> {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );

    return this.request<Deck[]>(`/decks?${query}`);
  }

  async getDeck(id: string): Promise<Deck> {
    return this.request<Deck>(`/decks/${id}`);
  }

  async createDeck(data: DeckCreateRequest): Promise<Deck> {
    return this.request<Deck>("/decks/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDeck(
    id: string,
    data: DeckUpdateRequest
  ): Promise<Deck> {
    return this.request<Deck>(`/decks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteDeck(id: string): Promise<void> {
    return this.request<void>(`/decks/${id}`, {
      method: "DELETE",
    });
  }

  async validateDeck(
    id: string
  ): Promise<{ is_valid: boolean; errors: string[] }> {
    return this.request(`/decks/${id}/validate`, {
      method: "POST",
    });
  }

  // AI Analysis
  async analyzeDeck(
    id: string,
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
    }
  ): Promise<{
    deck_id: string;
    deck_name: string;
    provider: string;
    model?: string;
    analysis: string;
    synergies: any[];
    cost_analysis: any;
    recommendations: any[];
  }> {
    const params = new URLSearchParams();
    if (options?.provider) params.append("provider", options.provider);
    if (options?.model) params.append("model", options.model);
    if (options?.temperature !== undefined)
      params.append("temperature", options.temperature.toString());

    return this.request(`/ai/analyze-deck/${id}?${params}`, {
      method: "POST",
    });
  }

  async getProviders(): Promise<{
    default_provider: string;
    providers: Array<{
      id: string;
      name: string;
      available: boolean;
      default_model: string;
      models: string[];
    }>;
  }> {
    return this.request("/ai/providers");
  }

  async getProviderInfo(provider: string): Promise<{
    id: string;
    name: string;
    available: boolean;
    default_model: string;
    models: string[];
  }> {
    return this.request(`/ai/providers/${provider}`);
  }

  async getQuickTips(id: string): Promise<{
    deck_id: string;
    tips: string[];
  }> {
    return this.request(`/ai/quick-tips/${id}`, {
      method: "POST",
    });
  }

  // Chat
  async createConversation(data: ConversationCreate): Promise<Conversation> {
    return this.request<Conversation>("/chat/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getConversations(params?: {
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return this.request<Conversation[]>(`/chat/conversations?${query}`);
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/chat/conversations/${id}`);
  }

  async deleteConversation(id: string): Promise<void> {
    return this.request<void>(`/chat/conversations/${id}`, {
      method: "DELETE",
    });
  }

  async getMessages(
    conversationId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<ChatMessage[]> {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    );
    return this.request<ChatMessage[]>(
      `/chat/conversations/${conversationId}/messages?${query}`
    );
  }

  getMessageStreamUrl(conversationId: string): string {
    return `${API_BASE_URL}/chat/conversations/${conversationId}/messages`;
  }

  // Settings
  async validateApiKey(
    provider: string,
    apiKey: string,
    localUrl?: string
  ): Promise<{ valid: boolean; provider: string; error?: string }> {
    return this.request("/settings/validate-key", {
      method: "POST",
      body: JSON.stringify({
        provider,
        api_key: apiKey,
        local_url: localUrl || undefined,
      }),
    });
  }

  async getProvidersWithKeys(
    apiKeys?: Record<string, string>
  ): Promise<{
    default_provider: string;
    providers: Array<{
      id: string;
      name: string;
      available: boolean;
      default_model: string;
      models: string[];
    }>;
  }> {
    return this.request("/settings/providers", {
      method: "POST",
      body: JSON.stringify({
        api_keys: apiKeys || {},
      }),
    });
  }

  async fetchModels(
    provider: string,
    apiKey?: string,
    localUrl?: string
  ): Promise<{ provider: string; models: string[]; source: string }> {
    return this.request("/settings/models", {
      method: "POST",
      body: JSON.stringify({
        provider,
        api_key: apiKey || undefined,
        local_url: localUrl || undefined,
      }),
    });
  }
}

export const api = new APIClient();
