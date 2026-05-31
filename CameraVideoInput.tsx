import { useId, useRef } from 'react';
import { Video, Loader2, Clapperboard } from 'lucide-react';

type Props = {
  label: string;
  url?: string;
  disabled?: boolean;
  busy?: boolean;
  hideCapture?: boolean;
  onCapture: (file: File) => void;
};

export default function CameraVideoInput({ label, url, disabled, busy, hideCapture, onCapture }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = Boolean(disabled);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      window.alert('Selecione um vídeo válido.');
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      window.alert('Vídeo muito grande. Grave até 20 MB (15-30 segundos).');
      e.target.value = '';
      return;
    }
    onCapture(file);
    e.target.value = '';
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-wide">{label}</p>
      {url ? (
        <video src={url} controls playsInline className="w-full rounded-lg max-h-32 object-cover border border-slate-200" />
      ) : (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-slate-300 text-slate-400 bg-white">
          <Clapperboard className="w-7 h-7 opacity-40" />
        </div>
      )}
      {!hideCapture && (
        <>
          <label
            htmlFor={inputId}
            className={`flex items-center justify-center gap-2 text-xs font-bold rounded-lg py-2.5 min-h-[44px] border transition-colors ${
              isDisabled || busy
                ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-500'
                : 'cursor-pointer bg-white border-slate-300 text-slate-800 hover:border-primary-400 hover:text-primary-700 active:scale-[0.99]'
            }`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4 shrink-0" />}
            {url ? 'Gravar outro vídeo' : 'Abrir câmera (vídeo)'}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            disabled={isDisabled || busy}
            onChange={handleChange}
          />
        </>
      )}
      {hideCapture && !url && (
        <p className="text-[10px] text-slate-400 text-center py-1">Aguardando registro do licenciado</p>
      )}
    </div>
  );
}
