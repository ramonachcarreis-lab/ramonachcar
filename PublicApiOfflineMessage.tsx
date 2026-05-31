import { WifiOff } from 'lucide-react';

type Props = {
  title?: string;
};

export default function PublicApiOfflineMessage({
  title = 'Link indisponível no momento',
}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md text-center space-y-3">
        <WifiOff className="w-10 h-10 text-amber-600 mx-auto" />
        <h1 className="text-lg font-black text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600 font-medium">
          O sistema está temporariamente fora do ar. Tente de novo em alguns minutos ou peça um novo
          link ao comercial da sua unidade.
        </p>
      </div>
    </div>
  );
}
