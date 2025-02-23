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
      admin_users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      guide_sections: {
        Row: {
          id: string
          title: string
          description: string
          order_position: number
          created_at: string
          updated_at: string
          admin_id: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          order_position: number
          created_at?: string
          updated_at?: string
          admin_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          order_position?: number
          created_at?: string
          updated_at?: string
          admin_id?: string
        }
      }
      guide_subsections: {
        Row: {
          id: string
          section_id: string
          title: string
          description: string
          malleability_level: 'green' | 'yellow' | 'red'
          order_position: number
          created_at: string
          updated_at: string
          admin_id: string
        }
        Insert: {
          id?: string
          section_id: string
          title: string
          description: string
          malleability_level: 'green' | 'yellow' | 'red'
          order_position: number
          created_at?: string
          updated_at?: string
          admin_id: string
        }
        Update: {
          id?: string
          section_id?: string
          title?: string
          description?: string
          malleability_level?: 'green' | 'yellow' | 'red'
          order_position?: number
          created_at?: string
          updated_at?: string
          admin_id?: string
        }
      }
      user_responses: {
        Row: {
          id: string
          user_id: string
          subsection_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subsection_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subsection_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          subsection_id: string
          completed: boolean
          flagged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subsection_id: string
          completed?: boolean
          flagged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subsection_id?: string
          completed?: boolean
          flagged?: boolean
          created_at?: string
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
  }
} 