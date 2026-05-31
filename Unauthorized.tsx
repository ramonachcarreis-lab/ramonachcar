import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const home = session?.role === 'commercial' ? '/sales-dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-md w-full">
        <h1 className="text-2xl font-black text-slate-900">Acesso não autorizado</h1>
        <p className="text-slate-500 mt-2">Seu perfil não tem permissão para essa área.</p>
        <button onClick={() => navigate(home)} className="mt-4 w-full bg-primary-900 text-white font-bold py-3 rounded-xl">
          Voltar ao painel
        </button>
      </div>
    </div>
  );
}