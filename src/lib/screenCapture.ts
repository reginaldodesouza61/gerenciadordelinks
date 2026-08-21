/**
 * Screen capture and image handling helpers for MeuHub Notes
 */

export async function captureScreen(): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('A API de captura de tela não é suportada neste navegador.');
  }

  // Request display media stream
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'monitor',
    } as MediaTrackConstraints,
    audio: false,
  });

  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;

    // Wait until video metadata and frame are ready
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve()).catch(reject);
      };
      video.onerror = () => reject(new Error('Falha ao processar vídeo da captura'));
      // Timeout fallback
      setTimeout(() => resolve(), 1000);
    });

    // Small delay to ensure frame is painted
    await new Promise((r) => setTimeout(r, 100));

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Falha ao inicializar contexto 2D para captura');
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/png', 0.95);

    return { dataUrl, width, height };
  } finally {
    // Stop all media tracks to release screen sharing indicator
    stream.getTracks().forEach((track) => track.stop());
  }
}

export function fileToDataUrl(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth || 600,
          height: img.naturalHeight || 400,
        });
      };
      img.onerror = () => {
        resolve({ dataUrl, width: 600, height: 400 });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'));
    reader.readAsDataURL(file);
  });
}
