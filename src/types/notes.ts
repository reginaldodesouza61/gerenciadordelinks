export interface NoteSection {
  id: string;
  nome: string;
  user_id: string;
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

export type BlockType = 'text' | 'script' | 'vault' | 'link' | 'image';

export type SecretType = 
  | 'api_token' 
  | 'password' 
  | 'db_connection' 
  | 'jwt_secret' 
  | 'ssh_key' 
  | 'webhook_secret' 
  | 'env_var' 
  | 'custom';

export type SecretEnv = 'local' | 'dev' | 'staging' | 'prod' | 'global';

export interface SecretItem {
  id: string;
  key: string;
  value: string;
  type: SecretType;
  env?: SecretEnv;
  notes?: string;
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
