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

export interface CustomCredentialField {
  id: string;
  name: string;
  value: string;
  type?: 'text' | 'password';
}

export type CredentialType = 
  | 'login'               // Usuário / Email e Senha padrão
  | 'graph_azure'         // Microsoft Graph / Azure AD (Client ID, Client Secret, Tenant ID, Object ID)
  | 'oauth_api'           // OAuth 2.0 / API Rest (Client ID, Client Secret, API Key, Redirect URI)
  | 'api_key'             // Chave de API / Token Simples (API Key, Bearer Token / Endpoint)
  | 'database'            // Banco de Dados (Host, Porta, Banco, Usuário, Senha)
  | 'aws_cloud'           // AWS / Cloud IAM (Access Key ID, Secret Access Key, Region, Role ARN)
  | 'custom';             // Personalizado (Campos livres criados pelo usuário)

export interface Credencial {
  id: string;
  link_id: string;
  user_id: string;
  credential_type?: CredentialType | string;
  username: string | null;
  password?: string | null;
  notes?: string | null;
  created_at?: string;
  // Campos avançados e customizados (Graph API, OAuth, Tokens, etc.)
  custom_fields?: CustomCredentialField[] | null;
}
