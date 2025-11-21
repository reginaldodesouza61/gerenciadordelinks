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

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
  description?: string;
}

export function ShareDialog({ open, onOpenChange, title, url, description }: ShareDialogProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  // Copy URL to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      
      // Fallback method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setIsCopied(true);
        toast.success('Link copiado para a área de transferência!');
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        toast.error('Não foi possível copiar o link');
      }
    }
  };

  // Share options
  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`, '_blank'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Telegram',
      icon: <Send className="h-5 w-5" />,
      action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      name: 'Email',
      icon: <Mail className="h-5 w-5" />,
      action: () => window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description ? description + '\n\n' : ''}${url}`)}`, '_blank'),
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: 'Facebook',
      icon: <Facebook className="h-5 w-5" />,
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin className="h-5 w-5" />,
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'),
      color: 'bg-blue-800 hover:bg-blue-900'
    },
    {
      name: 'Twitter',
      icon: <Twitter className="h-5 w-5" />,
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
      color: 'bg-blue-400 hover:bg-blue-500'
    },
  ];
  
  // Native share function
  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description || '',
          url: url
        });
        toast.success('Compartilhado com sucesso!');
        onOpenChange(false);
      } else {
        throw new Error('Native sharing not supported');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Não foi possível compartilhar nativamente');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Link</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          <div className="text-sm font-medium mb-2">{title}</div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Input 
                readOnly 
                value={url} 
                className="pr-12" 
              />
            </div>
            <Button 
              type="button"
              size="sm"
              variant="outline"
              className={isCopied ? "bg-green-50 text-green-600" : ""}
              onClick={copyToClipboard}
            >
              {isCopied ? (
                <>
                  <Clipboard className="h-4 w-4 mr-1" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>
          
          <div className="space-y-3">
            {navigator.share && (
              <Button 
                type="button"
                className="w-full bg-blue-500 hover:bg-blue-600 mb-2"
                onClick={handleNativeShare}
              >
                <Share2 className="h-5 w-5 mr-2" />
                Compartilhar (Nativo)
              </Button>
            )}
            
            <div className="text-sm font-medium text-gray-500 mb-1">Compartilhar via</div>
            
            <div className="grid grid-cols-3 gap-2">
              {shareOptions.map((option) => (
                <Button 
                  key={option.name}
                  type="button"
                  className={`${option.color} text-white`}
                  onClick={() => {
                    option.action();
                    // Don't close the modal to allow multiple shares
                  }}
                >
                  {option.icon}
                  <span className="ml-2">{option.name}</span>
                </Button>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}