export interface Card {
  id: string;
  name: string;
  type: string;
  color?: string;
  cost?: number;
  power?: number;
  counter?: number;
  attribute?: string;
  text?: string;
  trigger?: string;
  rarity?: string;
  category?: string;
  set_code?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Leader {
  id: string;
  name: string;
  life: number;
  power?: number;
  colors: string[];
  attribute?: string;
  text?: string;
  featured_character?: string;
  category?: string;
  set_code?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DeckCard {
  id: string;
  card: Card;
  quantity: number;
}

export interface Deck {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  leader_id: string;
  leader?: Leader;
  is_public: boolean;
  total_cards: number;
  avg_cost?: number;
  color_distribution?: Record<string, number>;
  deck_cards: DeckCard[];
  created_at: string;
  updated_at: string;
}

export interface DeckCreateRequest {
  name: string;
  description?: string;
  leader_id: string;
  is_public: boolean;
  cards: {
    card_id: string;
    quantity: number;
  }[];
}

export interface DeckUpdateRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
  leader_id?: string;
  cards?: {
    card_id: string;
    quantity: number;
  }[];
}
