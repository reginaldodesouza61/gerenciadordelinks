import { useState } from 'react';
import { useNoteStore } from '@/lib/store/noteStore';
import { useLinkStore } from '@/lib/store/linkStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Link as LinkIcon, X, ExternalLink, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function RelatedLinks({ pageId }: { pageId: string }) {
  const { user } = useAuthStore();
  const { relations, fetchNotes } = useNoteStore();
  const { links } = useLinkStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const relatedLinkIds = relations.filter(r => r.note_id === pageId).map(r => r.link_id);
  const relatedLinks = links.filter(l => relatedLinkIds.includes(l.id));
  
  const availableLinks = links.filter(l => !relatedLinkIds.includes(l.id) && l.titulo.toLowerCase().includes(searchTerm.toLowerCase()));

  const addRelation = async (linkId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('note_link_relations')
      .insert([{ note_id: pageId, link_id: linkId, user_id: user.id }]);
      
    if (error) {
      toast.error('Erro ao relacionar link');
    } else {
      toast.success('Link relacionado com sucesso');
      fetchNotes(user.id);
      setIsDialogOpen(false);
    }
  };

  const removeRelation = async (linkId: string) => {
    const relation = relations.find(r => r.note_id === pageId && r.link_id === linkId);
    if (!relation) return;
    
    const { error } = await supabase
      .from('note_link_relations')
      .delete()
      .eq('id', relation.id);
      
    if (error) {
      toast.error('Erro ao remover relação');
    } else {
      toast.success('Relação removida');
      if (user) fetchNotes(user.id);
    }
  };

  return (
    <div className="mt-8 border-t pt-6 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <LinkIcon size={16} className="text-gray-400" />
          Links Relacionados
        </h3>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setIsDialogOpen(true)}>
          <Plus size={14} /> Relacionar Link
        </Button>
      </div>
      
      {relatedLinks.length === 0 ? (
        <div className="text-sm text-gray-400 italic">Nenhum link relacionado a esta anotação.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {relatedLinks.map(link => (
            <div key={link.id} className="border rounded-lg p-3 hover:border-indigo-200 bg-gray-50 flex flex-col justify-between group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-700 hover:underline line-clamp-2">
                  {link.titulo}
                </a>
                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 shrink-0 text-gray-400 hover:text-red-600" onClick={() => removeRelation(link.id)}>
                  <X size={12} />
                </Button>
              </div>
              <div className="flex items-center text-xs text-gray-500 gap-1 truncate">
                <ExternalLink size={10} />
                <span className="truncate">{new URL(link.url).hostname}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Relacionar Link Salvo</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="relative">
              <Input 
                placeholder="Buscar links salvos..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50">
              {availableLinks.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-4">Nenhum link encontrado.</div>
              ) : (
                availableLinks.map(link => (
                  <div key={link.id} className="flex flex-col gap-1 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors" onClick={() => addRelation(link.id)}>
                    <span className="text-sm font-medium">{link.titulo}</span>
                    <span className="text-xs text-gray-500 truncate">{link.url}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
