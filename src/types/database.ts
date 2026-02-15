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
      groups: {
        Row: {
          id: string
          name: string
          logo: string | null
          type: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo?: string | null
          type?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo?: string | null
          type?: string
          is_active?: boolean
          created_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          group_id: string | null
          name: string
          alias: string | null
          description: string | null
          canon_scale: number
          specs: Json
          stages: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id?: string | null
          name: string
          alias?: string | null
          description?: string | null
          canon_scale?: number
          specs?: Json
          stages?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string | null
          name?: string
          alias?: string | null
          description?: string | null
          canon_scale?: number
          specs?: Json
          stages?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          name: string
          status: 'setup' | 'active' | 'completed'
          format: 'round_robin' | 'elimination' | 'hybrid'
          team_size: number
          start_date: string | null
          end_date: string | null
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'setup' | 'active' | 'completed'
          format?: 'round_robin' | 'elimination' | 'hybrid'
          team_size?: number
          start_date?: string | null
          end_date?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'setup' | 'active' | 'completed'
          format?: 'round_robin' | 'elimination' | 'hybrid'
          team_size?: number
          start_date?: string | null
          end_date?: string | null
          config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tournament_teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          image: string | null
          stats: Json
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          image?: string | null
          stats?: Json
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          image?: string | null
          stats?: Json
          created_at?: string
        }
      }
      tournament_participants: {
        Row: {
          id: string
          team_id: string
          character_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          character_id: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          character_id?: string
          created_at?: string
        }
      }
      tournament_matches: {
        Row: {
          id: string
          tournament_id: string
          round_number: number
          team_a_id: string
          team_b_id: string
          status: 'scheduled' | 'active' | 'completed'
          scheduled_date: string | null
          result: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round_number: number
          team_a_id: string
          team_b_id: string
          status?: 'scheduled' | 'active' | 'completed'
          scheduled_date?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round_number?: number
          team_a_id?: string
          team_b_id?: string
          status?: 'scheduled' | 'active' | 'completed'
          scheduled_date?: string | null
          result?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      
    }
  }
}
