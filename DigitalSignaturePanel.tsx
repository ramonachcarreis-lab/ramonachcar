import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, CheckCircle2, Share2 } from 'lucide-react';
import type { StoredSignature } from '../types/inventory';
import { getWhatsAppLink } from '../utils/formatters';
import { WHATSAPP_LABELS } from '../utils/whatsappContact';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  signerRole: 'client' | 'licensee';
  existing?: StoredSignature;
  signerNameDefault?: string;
  signerDocumentDefault?: string;
  readOnly?: boolean;
  onSave: (sig: StoredSignature) => void;
  whatsAppPhone?: string;
  shareMessage?: string;
};

export default function DigitalSignaturePanel({
  title,
  signerRole,
  existing,
  signerNameDefault = '',
  signerDocumentDefault = '',
  readOnly,
  onSave,
  whatsAppPhone,
  shareMessage,
}: Props) {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signerName, setSignerName] = useState(signerNameDefault);
  const [signerDocument, setSignerDocument] = useState(signerDocumentDefault);
  const [hasStroke, setHasStroke] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = isDark ? '#1a2540' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isDark]);

  useEffect(() => {
    initCanvas();
    const onResize = () => initCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [initCanvas, existing, isDark]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || existing) return;
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || readOnly || existing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };

  const endDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  const clear = () => {
    setHasStroke(false);
    initCanvas();
  };

  const handleConfirm = () => {
    if (!signerName.trim()) {
      window.alert('Informe o nome de quem assina.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasStroke && !existing) {
      window.alert('Desenhe a assinatura no quadro abaixo.');
      return;
    }
    const imageDataUrl = existing?.imageDataUrl || canvas.toDataURL('image/png');
    onSave({
      imageDataUrl,
      signedAt: new Date().toISOString(),
      signerName: signerName.trim(),
      signerDocument: signerDocument.trim() || undefined,
    });
  };

  if (existing) {
    return (
      <div className="tone-success tone-box border-2 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase">{title}</p>
            <p className="text-[10px] font-bold">
              {signerRole === 'client' ? 'Cliente' : 'Locador'} · {existing.signerName}
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {new Date(existing.signedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        <img
          src={existing.imageDataUrl}
          alt="Assinatura"
          className="w-full max-h-28 object-contain rounded-xl border border-[var(--color-border)] p-2 bg-[var(--color-surface-muted)]"
        />
      </div>
    );
  }

  return (
    <div className="tone-accent tone-box border-2 space-y-3 w-full min-w-0">
      <div className="flex items-center gap-2">
        <PenLine className="w-5 h-5 shrink-0 text-violet-400" />
        <div>
          <p className="text-xs font-black uppercase tone-title">{title}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Assinatura digital — válida para formalização do contrato (sem depender de PDF).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="ui-label">Nome completo *</label>
          <input
            disabled={readOnly}
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="app-input mt-0.5 min-h-[44px]"
          />
        </div>
        {signerRole === 'client' && (
          <div>
            <label className="ui-label">CPF (opcional)</label>
            <input
              disabled={readOnly}
              value={signerDocument}
              onChange={(e) => setSignerDocument(e.target.value)}
              placeholder="000.000.000-00"
              className="app-input mt-0.5 min-h-[44px]"
            />
          </div>
        )}
      </div>

      <div className="relative rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-36 touch-none cursor-crosshair"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
        />
        <p className="absolute bottom-1 right-2 text-[9px] text-[var(--color-text-subtle)] pointer-events-none">
          Assine com o dedo ou mouse
        </p>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clear}
            className="flex-1 min-w-[120px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1"
          >
            <Eraser className="w-4 h-4" />
            Limpar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-w-[140px] bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar assinatura
          </button>
          {whatsAppPhone && shareMessage && (
            <a
              href={getWhatsAppLink(whatsAppPhone, shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {WHATSAPP_LABELS.signature}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
