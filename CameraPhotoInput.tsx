import { useId, useRef } from 'react';
import { Camera, Loader2, ImageIcon } from 'lucide-react';

type Props = {
  label: string;
  url?: string;
  disabled?: boolean;
  busy?: boolean;
  /** Oculta botão de câmera (acompanhamento comercial). */
  hideCapture?: boolean;
  onCapture: (file: File) => void;
};

/**
 * Input de câmera para mobile: capture="environment" abre a câmera traseira em tempo real.
 * accept restringe a imagens; input é recriado após cada captura para permitir nova foto.
 */
export default function CameraPhotoInput({
  label,
  url,
  disabled,
  busy,
  hideCapture,
  onCapture,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = Boolean(disabled);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Selecione uma imagem válida.');
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
        <img src={url} alt={label} className="w-full rounded-lg max-h-32 object-cover border border-slate-200" />
      ) : (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-slate-300 text-slate-400 bg-white">
          <ImageIcon className="w-7 h-7 opacity-40" />
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
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 shrink-0" />}
            {url ? 'Tirar outra foto' : 'Abrir câmera'}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/*"
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
