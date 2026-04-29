import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Clipboard, Mail, ExternalLink, Copy, 
  MessageCircle, Send, Share2, Facebook, 
  Linkedin, Twitter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
  description?: string;
}

export function ShareDialog({ open, onOpenChange, title, url, description }: ShareDialogProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`, '_blank'),
      color: 'bg-[#25D366] hover:bg-[#128C7E]'
    },
    {
      name: 'Telegram',
      icon: <Send className="h-5 w-5" />,
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
      color: 'bg-[#0088cc] hover:bg-[#0077b5]'
    },
    {
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
      color: 'bg-[#1877F2] hover:bg-[#0d6efd]'
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5" />,
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'),
      color: 'bg-[#0A66C2] hover:bg-[#004182]'
    },
    {
      name: 'Twitter',
      icon: <Twitter className="h-5 w-5" />,
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
      color: 'bg-[#1DA1F2] hover:bg-[#0c85d0]'
    },
    {
      name: 'Email',
      icon: <Mail className="h-5 w-5" />,
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description ? description + '\n\n' : ''}${url}`)}`, '_blank'),
      color: 'bg-zinc-600 hover:bg-zinc-700'
    },
  ];
  
  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: description || '', url });
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-gradient">Compartilhar Link</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="text-sm font-bold truncate mb-1">{title}</div>
            <div className="text-xs text-muted-foreground truncate">{url}</div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input 
                readOnly 
                value={url} 
                className="rounded-xl bg-muted/30 border-none h-10" 
              />
            </div>
            <Button 
              type="button"
              className={cn("rounded-xl h-10 gap-2", isCopied && "bg-primary text-primary-foreground")}
              onClick={copyToClipboard}
              variant={isCopied ? "default" : "secondary"}
            >
              {isCopied ? <Clipboard className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          
          <div className="space-y-4">
            {navigator.share && (
              <Button 
                type="button"
                className="w-full h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 gap-2"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar Sistema
              </Button>
            )}
            
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Ou envie via</div>
            
            <div className="grid grid-cols-3 gap-3">
              {shareOptions.map((option) => (
                <button 
                  key={option.name}
                  type="button"
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all hover:scale-105 active:scale-95",
                    option.color,
                    "text-white shadow-sm"
                  )}
                  onClick={() => option.action()}
                >
                  {option.icon}
                  <span className="text-[10px] font-bold">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-primary/20 hover:bg-primary/5 gap-2"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir link no navegador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}