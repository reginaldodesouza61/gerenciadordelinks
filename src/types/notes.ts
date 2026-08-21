export interface NoteSection {
  id: string;
  nome: string;
  user_id: string;
  ordem?: number;
  created_at: string;
}

export interface NotePage {
  id: string;
  titulo: string;
  conteudo: string | null;
  section_id: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
}

export interface NoteLinkRelation {
  id: string;
  note_id: string;
  link_id: string;
  user_id: string;
}

export interface DeletedNoteItem {
  id: string;
  type: 'page' | 'section';
  title: string;
  deletedAt: string;
  pageData?: NotePage;
  subpages?: NotePage[];
  sectionData?: NoteSection;
  sectionPages?: NotePage[];
}

export type BlockType = 'text' | 'script' | 'vault' | 'link' | 'image';

export type SecretType = 
  | 'password'          // Usuário e Senha tradicional
  | 'api_token'         // Chave de API / Token Simples
  | 'oauth_api'         // OAuth 2.0 / Client ID & Secret
  | 'azure_graph'       // Microsoft Graph / Azure AD (Client ID, Secret, Tenant, Object ID)
  | 'db_connection'     // Banco de Dados (Host, Porta, Banco, Usuário, Senha)
  | 'jwt_secret'        // JWT Secret
  | 'ssh_key'           // Chave SSH / Cert
  | 'webhook_secret'    // Webhook Secret
  | 'env_var'           // Variável .ENV
  | 'custom';           // Personalizado / Geral

export type SecretEnv = 'local' | 'dev' | 'staging' | 'prod' | 'global';

export interface SecretItemCustomField {
  id: string;
  name: string;
  value: string;
  type?: 'text' | 'password';
}

export interface SecretItem {
  id: string;
  key: string;
  username?: string;
  value: string;
  url?: string;
  type: SecretType;
  env?: SecretEnv;
  notes?: string;
  
  // Specific fields for API / OAuth / Azure
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  objectId?: string;
  redirectUri?: string;

  // Specific fields for DB
  dbHost?: string;
  dbPort?: string;
  dbName?: string;
  dbUser?: string;

  // Extra dynamic fields
  customFields?: SecretItemCustomField[];
}

export interface CanvasBlock {
  id: string;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  type?: BlockType;
  
  // For 'text' block
  content?: string;
  
  // For 'script' block
  title?: string;
  description?: string;
  targetPurpose?: string;
  language?: string;
  filename?: string;
  code?: string;
  wrapLines?: boolean;
  theme?: 'dark' | 'light';
  viewMode?: 'edit' | 'preview';
  showDescription?: boolean;
  
  // For 'vault' block (Credentials / Tokens / Passwords)
  vaultTitle?: string;
  secrets?: SecretItem[];
  
  // For 'link' block (Connected to existing registered link)
  linkId?: string;
  linkTitle?: string;
  linkUrl?: string;
  linkCategory?: string;
  linkSubcategory?: string;
  linkDescription?: string;
  linkImageUrl?: string | null;

  // For 'image' block (Screen capture / Upload / Paste)
  imageUrl?: string;
  imageTitle?: string;
  imageCaption?: string;
  capturedAt?: string;
}
