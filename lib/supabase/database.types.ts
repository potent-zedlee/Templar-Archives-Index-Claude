export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      partners: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          nickname: string | null
          avatar_url: string | null
          role: string
          partner_id: string | null
          stats: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nickname?: string | null
          avatar_url?: string | null
          role?: string
          partner_id?: string | null
          stats?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nickname?: string | null
          avatar_url?: string | null
          role?: string
          partner_id?: string | null
          stats?: Json | null
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          partner_id: string | null
          name: string
          category: string
          location: string | null
          city: string | null
          country: string | null
          start_date: string | null
          end_date: string | null
          status: string
          stats: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          partner_id?: string | null
          name: string
          category: string
          location?: string | null
          city?: string | null
          country?: string | null
          start_date?: string | null
          end_date?: string | null
          status?: string
          stats?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          partner_id?: string | null
          name?: string
          category?: string
          location?: string | null
          status?: string
          stats?: Json | null
        }
      }
      events: {
        Row: {
          id: string
          tournament_id: string
          partner_id: string | null
          name: string
          date: string | null
          status: string
          stats: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          partner_id?: string | null
          name: string
          date?: string | null
          status?: string
          stats?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          stats?: Json | null
        }
      }
      streams: {
        Row: {
          id: string
          event_id: string | null
          tournament_id: string | null
          partner_id: string | null
          name: string
          video_url: string | null
          video_source: string | null
          status: string
          stats: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          tournament_id?: string | null
          partner_id?: string | null
          name: string
          video_url?: string | null
          video_source?: string | null
          status?: string
          stats?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          tournament_id?: string | null
          name?: string
          video_url?: string | null
          status?: string
          stats?: Json | null
        }
      }
      hands: {
        Row: {
          id: string
          stream_id: string
          event_id: string | null
          tournament_id: string | null
          hand_number: number
          description: string | null
          board_flop: string[] | null
          board_turn: string | null
          board_river: string | null
          pot_size: number | null
          players_json: Json
          actions_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          stream_id: string
          event_id?: string | null
          tournament_id?: string | null
          hand_number: number
          description?: string | null
          board_flop?: string[] | null
          board_turn?: string | null
          board_river?: string | null
          pot_size?: number | null
          players_json?: Json
          actions_json?: Json
          created_at?: string
        }
        Update: {
          id?: string
          hand_number?: number
          description?: string | null
          pot_size?: number | null
          players_json?: Json
          actions_json?: Json
        }
      }
      players: {
        Row: {
          id: string
          name: string
          photo_url: string | null
          country: string | null
          total_winnings: number
          stats: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          photo_url?: string | null
          country?: string | null
          total_winnings?: number
          stats?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          photo_url?: string | null
          country?: string | null
          total_winnings?: number
          stats?: Json | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
