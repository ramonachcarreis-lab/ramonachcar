import type { ComponentType } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Timer,
  DollarSign,
  Users,
  LogOut,
  Building2,
  UserCircle,
  FolderPlus,
  ClipboardList,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import AlertsBellPanel from './AlertsBellPanel';
import ApiStatusBanner from './ApiStatusBanner';

type NavItem = {
  to: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
};

export default function Layout() {
  const navigate = useNavigate();
  const { session, logout, userRole } = useAuth();

  const navItems: NavItem[] =
    userRole === 'admin'
      ? [
          { to: '/sales-dashboard', icon: LayoutDashboard, label: 'Início' },
          { to: '/crm', icon: ClipboardList, label: 'Controle' },
          { to: '/admin', icon: FolderPlus, label: 'Cadastro' },
          { to: '/faturamento-rede', icon: DollarSign, label: 'Faturamento' },
          { to: '/licenciados', icon: Building2, label: 'Rede' },
          { to: '/agenda-comercial', icon: Calendar, label: 'Agenda' },
          { to: '/operacao', icon: Timer, label: 'Operação' },
        ]
      : userRole === 'licenciado'
        ? [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Início' },
            { to: '/agenda', icon: Calendar, label: 'Agenda' },
            { to: '/tempo', icon: Timer, label: 'Tempo' },
            { to: '/financas', icon: DollarSign, label: 'Finanças' },
            { to: '/crm', icon: Users, label: 'CRM' },
          ]
        : [
            { to: '/sales-dashboard', icon: LayoutDashboard, label: 'Início' },
            { to: '/crm', icon: Users, label: 'CRM' },
            { to: '/licenciados', icon: Building2, label: 'Rede' },
            { to: '/agenda-comercial', icon: Calendar, label: 'Agenda' },
            { to: '/operacao', icon: Timer, label: 'Operação' },
            { to: '/faturamento-rede', icon: DollarSign, label: 'Financeiro' },
            { to: '/perfil-comercial', icon: UserCircle, label: 'Vendas' },
          ];

  const roleLabel =
    session?.role === 'admin'
      ? `Admin Master · ${session?.name}`
      : session?.role === 'commercial'
        ? `Comercial · ${session?.name || 'visão macro'}`
        : `Operador · ${session?.unitId}`;

  const navLinkClass = (isActive: boolean, compact = false) =>
    clsx(
      'flex items-center gap-3 font-bold transition-colors rounded-xl',
      compact
        ? 'flex-col gap-0.5 px-2 min-w-[52px] min-h-[48px] justify-center shrink-0'
        : 'px-3 py-2.5 text-sm w-full',
      isActive
        ? compact
          ? 'nav-link-active-compact'
          : 'nav-link-active'
        : compact
          ? 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]'
    );

  return (
    <div className="flex flex-col min-h-screen lg:min-h-0 lg:h-screen bg-[var(--color-bg-app)]">
      <ApiStatusBanner />
      <header className="bg-[var(--color-header-bg)] border-b border-[var(--color-border)] px-4 lg:px-6 py-3 flex items-center justify-between gap-3 shrink-0 z-40 relative">
        <div className="text-xs lg:text-sm font-bold text-[var(--color-text-muted)] truncate min-w-0">
          {roleLabel}
        </div>
        <div className="flex items-center gap-2 shrink-0">
        <AlertsBellPanel />
        <ThemeToggle />
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-xs font-bold text-[var(--color-text-muted)] flex items-center gap-1 hover:text-[var(--color-text)] shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Menu lateral — só web */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 shrink-0 bg-[var(--color-nav-bg)] border-r border-[var(--color-border)] py-4 px-3 overflow-y-auto">
          <p className="text-[10px] font-black text-[var(--color-text-subtle)] uppercase tracking-wider px-3 mb-3">
            Menu
          </p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navLinkClass(isActive, false)}
              >
                <item.icon className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto w-full min-w-0 bg-[var(--color-bg-app)]">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior — mobile e tablet */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-nav-bg)] border-t border-[var(--color-border)] py-2 z-50 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="flex justify-between items-center max-w-lg mx-auto px-1 overflow-x-auto gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => navLinkClass(isActive, true)}
            >
              <item.icon className="w-5 h-5" strokeWidth={2.5} />
              <span className="text-[9px] tracking-wide uppercase">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
