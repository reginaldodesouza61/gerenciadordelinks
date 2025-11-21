export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: {
          id: string;
          nome: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          created_at?: string;
        };
      };
      subcategorias: {
        Row: {
          id: string;
          nome: string;
          categoria_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          categoria_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          categoria_id?: string;
          created_at?: string;
        };
      };
      links: {
        Row: {
          id: string;
          titulo: string;
          url: string;
          categoria_id: string;
          subcategoria_id: string | null;
          descricao: string | null;
          imagem_url: string | null;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          url: string;
          categoria_id: string;
          subcategoria_id?: string | null;
          descricao?: string | null;
          imagem_url?: string | null;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          url?: string;
          categoria_id?: string;
          subcategoria_id?: string | null;
          descricao?: string | null;
          imagem_url?: string | null;
          user_id?: string;
          created_at?: string;
        };
      };
    };
  };
};

export type Categoria = Database['public']['Tables']['categorias']['Row'];
export type Subcategoria = Database['public']['Tables']['subcategorias']['Row'];
export type Link = Database['public']['Tables']['links']['Row'];