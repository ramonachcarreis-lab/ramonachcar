import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import ApiStatusBanner from '../components/ApiStatusBanner';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithCredentials } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const session = loginWithCredentials(username.trim(), password);
      if (!session) {
        setError('Usuário ou senha inválidos.');
        return;
      }
      if (session.role === 'admin') navigate('/sales-dashboard');
      else if (session.role === 'commercial') navigate('/sales-dashboard');
      else navigate('/dashboard');
    } catch {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen min-h-screen flex flex-col justify-center items-center p-4 relative">
      <ApiStatusBanner />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[var(--bg-canvas)] rounded-3xl mx-auto mb-4 flex items-center justify-center border border-[var(--border-subtle)]">
            <span className="text-[var(--accent-primary)] font-black text-3xl tracking-tighter">EP</span>
          </div>
          <h1 className="login-title text-3xl font-black tracking-tight">Estofado Pro</h1>
          <p className="login-subtitle font-medium mt-1">Usuário e senha</p>
        </div>

        <form onSubmit={handleLogin} className="app-panel p-6 rounded-3xl space-y-4">
          {error && (
            <div className="tone-danger tone-box text-sm font-bold text-center">{error}</div>
          )}

          <div>
            <label className="ui-label block mb-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] pointer-events-none z-10" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="app-input !py-3 !pl-12 pr-4 w-full"
                placeholder="ex: joao.comercial"
              />
            </div>
          </div>

          <div>
            <label className="ui-label block mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] pointer-events-none z-10" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="app-input !py-3 !pl-12 pr-4 w-full"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-submit w-full py-4 rounded-xl transition-colors disabled:opacity-70 mt-2 min-h-[44px]"
          >
            {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <p className="text-center text-xs text-caption font-medium mt-8">
          © {new Date().getFullYear()} Estofado Pro. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
