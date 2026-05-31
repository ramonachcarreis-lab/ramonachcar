import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, RotateCw, Check, AlertCircle } from 'lucide-react';
import { loadImageFromFile, exportCroppedImage, type CropState } from '../utils/imageCrop';
import { PHOTO_RULES, validateImageFile, validateImageDimensions } from '../utils/imageRules';

type Props = {
  file: File;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
};

export default function ImageEditorModal({ file, onConfirm, onCancel }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, offsetX: 0, offsetY: 0 });
  const scrollYRef = useRef(0);

  useEffect(() => {
    scrollYRef.current = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = '';
      window.scrollTo(0, scrollYRef.current);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError('');
    setInfo('');

    (async () => {
      const v1 = validateImageFile(file);
      if (!v1.ok) {
        if (!cancelled) setError(v1.message);
        return;
      }
      try {
        const v2 = await validateImageDimensions(file);
        if (!v2.ok) {
          if (!cancelled) setError(v2.message);
          return;
        }
        const img = await loadImageFromFile(file);
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setImgEl(img);
        setInfo(
          `Original: ${v2.dimensions.width}×${v2.dimensions.height}px · Saída 4:3 · máx. ${PHOTO_RULES.maxOutputKb}KB`
        );
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao abrir imagem');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleConfirm = useCallback(() => {
    if (!imgEl || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      try {
        const dataUrl = exportCroppedImage(imgEl, crop);
        onConfirm(dataUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao processar');
        setBusy(false);
      }
    }, 0);
  }, [imgEl, crop, onConfirm, busy]);

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/75 overscroll-contain"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(90vh,720px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <div>
            <p className="text-sm font-black text-slate-900">Ajustar foto do item</p>
            <p className="text-[10px] text-slate-500">Corte, zoom e enquadramento 4:3</p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 rounded-full bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {error && (
            <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}
          {!ready && !error && (
            <p className="text-sm text-slate-500 text-center py-8">Carregando imagem…</p>
          )}
          {info && !error && ready && (
            <p className="text-[10px] font-medium text-slate-600 bg-slate-50 rounded-lg p-2">{info}</p>
          )}

          <div className="aspect-[4/3] max-h-[40vh] w-full rounded-xl border-2 border-slate-200 bg-slate-100 overflow-hidden relative mx-auto">
            {previewUrl && !error && ready ? (
              <img
                src={previewUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-150"
                style={{
                  transform: `scale(${crop.zoom}) translate(${crop.offsetX * 12}%, ${crop.offsetY * 12}%)`,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                Prévia
              </div>
            )}
          </div>

          {ready && !error && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" />
                  Zoom ({crop.zoom.toFixed(1)}x)
                </label>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={crop.zoom}
                  onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Horizontal</label>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={crop.offsetX}
                    onChange={(e) => setCrop((c) => ({ ...c, offsetX: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Vertical</label>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={crop.offsetY}
                    onChange={(e) => setCrop((c) => ({ ...c, offsetY: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCrop({ zoom: 1, offsetX: 0, offsetY: 0 })}
                className="text-xs font-bold text-primary-700 flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Resetar enquadramento
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t flex gap-2 shrink-0 bg-white">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!!error || !imgEl || !ready || busy}
            onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-primary-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {busy ? 'Salvando…' : 'Usar foto'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
