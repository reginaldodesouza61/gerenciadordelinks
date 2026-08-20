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
