import { useMemo, useState } from 'react';
import {
  Handshake,
  Target,
  UserPlus,
  Save,
  TrendingUp,
  ChevronRight,
  QrCode,
  X,
} from 'lucide-react';
import { useEvents } from '../context/EventsContext';
import { loadUsers, saveUsers, upsertUser, usernameTaken } from '../services/usersStorage';
import type { AppUser } from '../types/users';
import { isCommercialOwnedDeal } from '../utils/crmAccess';
import { filterCommercialClosed } from '../utils/commercialFilters';
import { getEffectiveCrmStep } from '../utils/crmFlow';
import { CRM_FLOW_LABELS } from '../types/crm';
import { loadCompanyPix, saveCompanyPix, type PixConfig } from '../services/pixStorage';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { formatLeadTitle } from '../utils/eventTypes';
import NotificationsSettings from '../components/NotificationsSettings';

export default function AdminComercial() {
  const { events } = useEvents();
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyPix, setCompanyPix] = useState<PixConfig>(() => loadCompanyPix());
  const [pixSaved, setPixSaved] = useState(false);

  const [form, setForm] = useState({
    username: '',
    password: '',
    displayName: '',
    monthlyGoal: 15000,
  });
  const [msg, setMsg] = useState('');

  const commercialUsers = users.filter((u) => u.role === 'commercial' && u.active);
  const selected = commercialUsers.find((u) => u.id === selectedId) || null;

  const refresh = () => setUsers(loadUsers());

  const statsFor = (name: string) => {
    const owned = events.filter((e) => isCommercialOwnedDeal(e, name));
    const active = owned.filter((e) => e.status === 'pending');
    const closed = filterCommercialClosed(owned);
    const now = new Date();
    const monthClosed = closed.filter((e) => {
      const d = new Date(e.updatedAt || e.createdAt || e.date);
      return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
    });
    const monthRevenue = monthClosed.reduce((s, e) => s + (e.totalValue || 0), 0);
    const goal = users.find((u) => u.displayName === name)?.monthlyGoal || 15000;
    return {
      activeCount: active.length,
      closedCount: closed.length,
      monthRevenue,
      goal,
      pct: Math.min((monthRevenue / goal) * 100, 100),
      history: [...owned]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || b.date).getTime() -
            new Date(a.updatedAt || a.createdAt || a.date).getTime()
        )
        .slice(0, 20),
    };
  };

  const ranked = useMemo(
    () =>
      commercialUsers
        .map((u) => ({ user: u, ...statsFor(u.displayName) }))
        .sort((a, b) => b.monthRevenue - a.monthRevenue),
    [commercialUsers, events, users]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (usernameTaken(form.username)) {
      setMsg('Login já existe.');
      return;
    }
    const user: AppUser = {
      id: `user-com-${Date.now()}`,
      username: form.username.trim().toLowerCase(),
      password: form.password,
      displayName: form.displayName.trim(),
      role: 'commercial',
      unitId: 'all',
      active: true,
      monthlyGoal: form.monthlyGoal,
      createdAt: new Date().toISOString(),
    };
    upsertUser(user);
    refresh();
    setForm({ username: '', password: '', displayName: '', monthlyGoal: 15000 });
    setMsg('Comercial cadastrado.');
  };

  const updateGoal = (userId: string, goal: number) => {
    const list = loadUsers().map((u) =>
      u.id === userId ? { ...u, monthlyGoal: Math.max(0, goal) } : u
    );
    saveUsers(list);
    refresh();
  };

  const savePix = () => {
    saveCompanyPix(companyPix);
    setPixSaved(true);
    setTimeout(() => setPixSaved(false), 2500);
  };

  const selectedStats = selected ? statsFor(selected.displayName) : null;

  return (
    <div className="page-container-wide">
      <header className="mb-4">
        <h1 className="text-2xl font-black text-primary-900">Equipe Comercial</h1>
      </header>

      <div className="mb-6 max-w-3xl">
        <NotificationsSettings />
      </div>

      <section className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-primary-600" />
          PIX da empresa (propostas do comercial)
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          O comercial vende com o PIX cadastrado aqui. Aparece na proposta em PDF e no WhatsApp.
        </p>
        <div className="space-y-2">
          <input
            placeholder="Titular / razão social"
            value={companyPix.holderName}
            onChange={(e) => setCompanyPix({ ...companyPix, holderName: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-medium"
          />
          <select
            value={companyPix.keyType}
            onChange={(e) =>
              setCompanyPix({
                ...companyPix,
                keyType: e.target.value as PixConfig['keyType'],
              })
            }
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-bold"
          >
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
            <option value="email">E-mail</option>
            <option value="phone">Telefone</option>
            <option value="random">Chave aleatória</option>
          </select>
          <input
            placeholder="Chave PIX"
            value={companyPix.key}
            onChange={(e) => setCompanyPix({ ...companyPix, key: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-bold"
          />
          <input
            placeholder="Banco (opcional)"
            value={companyPix.bankName || ''}
            onChange={(e) => setCompanyPix({ ...companyPix, bankName: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-medium"
          />
          <button
            type="button"
            onClick={savePix}
            className="w-full bg-primary-900 text-white font-bold py-3 rounded-xl"
          >
            Salvar PIX da empresa
          </button>
          {pixSaved && <p className="text-sm font-bold text-emerald-600">PIX salvo.</p>}
        </div>
      </section>

      <form
        onSubmit={handleCreate}
        className="bg-white border border-slate-100 rounded-2xl p-4 mb-4 space-y-2 shadow-sm"
      >
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Novo comercial
        </h2>
        <input
          placeholder="Nome"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-xl py-3 px-3"
          required
        />
        <input
          placeholder="Login"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-xl py-3 px-3"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full border-2 border-slate-100 rounded-xl py-3 px-3"
          required
        />
        <input
          type="number"
          min={0}
          placeholder="Meta mensal (R$)"
          value={form.monthlyGoal}
          onChange={(e) => setForm({ ...form, monthlyGoal: Number(e.target.value) || 0 })}
          className="w-full border-2 border-slate-100 rounded-xl py-3 px-3 font-bold"
        />
        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">
          Cadastrar comercial
        </button>
        {msg && <p className="text-sm font-bold text-emerald-700">{msg}</p>}
      </form>

      <div className="space-y-2 mb-4">
        {ranked.map(({ user, activeCount, monthRevenue, goal, pct }) => (
          <button
            key={user.id}
            type="button"
            onClick={() => setSelectedId(user.id)}
            className="w-full text-left bg-white border border-slate-100 rounded-xl p-4 hover:border-primary-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">{user.displayName}</p>
                <p className="text-xs text-slate-500">@{user.username}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex gap-3 mt-2 text-xs font-bold">
              <span className="text-amber-700">{activeCount} neg. ativas</span>
              <span className="text-emerald-700">
                R$ {monthRevenue.toLocaleString('pt-BR')} / {goal.toLocaleString('pt-BR')}
              </span>
              <span className="text-primary-700">{pct.toFixed(0)}% meta</span>
            </div>
          </button>
        ))}
      </div>

      {selected && selectedStats && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selected.displayName}</h3>
                <p className="text-xs text-slate-500">Histórico e meta</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-primary-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-primary-800 uppercase flex items-center gap-1">
                <Target className="w-4 h-4" />
                Meta do mês
              </p>
              <input
                type="number"
                min={0}
                defaultValue={selected.monthlyGoal || 15000}
                onBlur={(e) => updateGoal(selected.id, Number(e.target.value) || 0)}
                className="w-full border-2 border-white rounded-xl py-3 px-3 font-black mt-2"
              />
              <p className="text-sm font-bold text-emerald-800 mt-2">
                Realizado: R$ {selectedStats.monthRevenue.toLocaleString('pt-BR')} (
                {selectedStats.pct.toFixed(0)}%)
              </p>
            </div>

            <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
              <Handshake className="w-4 h-4" />
              Negociações ({selectedStats.history.length})
            </h4>
            <div className="space-y-2 mb-4">
              {selectedStats.history.map((ev) => {
                const step = getEffectiveCrmStep(ev);
                return (
                  <div key={ev.id} className="border border-slate-100 rounded-xl p-3 text-sm">
                    <p className="font-bold text-slate-800 truncate">
                      {formatLeadTitle(ev.eventType, ev.honoreeName, ev.client)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(ev.date).toLocaleDateString('pt-BR')} ·{' '}
                      {CRM_FLOW_LABELS[step]} · R$ {(ev.totalValue || 0).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp className="w-4 h-4" />
              {selectedStats.closedCount} fechados no total · {selectedStats.activeCount} em andamento
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
