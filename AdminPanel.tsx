import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderPlus,
  Building2,
  Handshake,
  UserPlus,
  Save,
  Phone,
  Target,
} from 'lucide-react';
import { useLicensees } from '../context/LicenseesContext';
import { loadUsers, saveUsers, upsertUser, usernameTaken } from '../services/usersStorage';
import type { AppUser } from '../types/users';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { cardsContainer } from '../utils/viewModeLayout';

function slugifyUnitId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type CadastroKind = 'unidade' | 'comercial';
type ListFilter = 'todos' | 'unidades' | 'comerciais';

export default function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKind =
    searchParams.get('tipo') === 'comercial' ? 'comercial' : 'unidade';
  const [kind, setKind] = useState<CadastroKind>(initialKind);
  const [listFilter, setListFilter] = useState<ListFilter>('todos');
  const { licensees, addLicensee } = useLicensees();
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());
  const { mode: viewMode, setMode: setViewMode } = useViewMode('grid');

  const [unitForm, setUnitForm] = useState({
    unitName: '',
    city: '',
    state: 'SP',
    phone: '',
    username: '',
    password: '',
    responsibleName: '',
  });

  const [commercialForm, setCommercialForm] = useState({
    username: '',
    password: '',
    displayName: '',
    monthlyGoal: 15000,
  });

  const [msg, setMsg] = useState('');

  const licenseeUsers = useMemo(
    () => users.filter((u) => u.role === 'licensee'),
    [users]
  );
  const commercialUsers = useMemo(
    () => users.filter((u) => u.role === 'commercial'),
    [users]
  );

  const refresh = () => setUsers(loadUsers());

  const setKindAndUrl = (k: CadastroKind) => {
    setKind(k);
    setSearchParams(k === 'comercial' ? { tipo: 'comercial' } : {});
    setMsg('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    const unitId = slugifyUnitId(unitForm.unitName);
    if (!unitId) {
      setMsg('Informe o nome da unidade.');
      return;
    }
    if (licensees.some((l) => l.id === unitId)) {
      setMsg('Já existe uma unidade com esse nome/ID.');
      return;
    }
    if (usernameTaken(unitForm.username)) {
      setMsg('Este login já está em uso.');
      return;
    }

    const displayName = unitForm.responsibleName.trim() || unitForm.unitName.trim();

    addLicensee({
      id: unitId,
      name: unitForm.unitName.trim(),
      city: unitForm.city.trim(),
      state: unitForm.state.trim().toUpperCase(),
      whatsapp: unitForm.phone.replace(/\D/g, ''),
      instagram: '',
      googleBusinessUrl: '',
      active: true,
      joinedAt: new Date().toISOString(),
      inauguratedAt: null,
      plannedInaugurationAt: new Date().toISOString().slice(0, 10),
    });

    const user: AppUser = {
      id: `user-lic-${unitId}-${Date.now()}`,
      username: unitForm.username.trim().toLowerCase(),
      password: unitForm.password,
      displayName,
      role: 'licensee',
      unitId,
      phone: unitForm.phone.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    upsertUser(user);
    refresh();

    setUnitForm({
      unitName: '',
      city: '',
      state: 'SP',
      phone: '',
      username: '',
      password: '',
      responsibleName: '',
    });
    setMsg(`Unidade "${unitForm.unitName}" criada. Login: ${user.username}`);
  };

  const handleCreateCommercial = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (usernameTaken(commercialForm.username)) {
      setMsg('Login já existe.');
      return;
    }
    const user: AppUser = {
      id: `user-com-${Date.now()}`,
      username: commercialForm.username.trim().toLowerCase(),
      password: commercialForm.password,
      displayName: commercialForm.displayName.trim(),
      role: 'commercial',
      unitId: 'all',
      active: true,
      monthlyGoal: commercialForm.monthlyGoal,
      createdAt: new Date().toISOString(),
    };
    upsertUser(user);
    refresh();
    setCommercialForm({
      username: '',
      password: '',
      displayName: '',
      monthlyGoal: 15000,
    });
    setMsg(`Comercial "${user.displayName}" cadastrado.`);
  };

  const toggleActive = (userId: string) => {
    const list = loadUsers().map((u) =>
      u.id === userId ? { ...u, active: !u.active } : u
    );
    saveUsers(list);
    refresh();
  };

  const updateCommercialGoal = (userId: string, goal: number) => {
    const list = loadUsers().map((u) =>
      u.id === userId ? { ...u, monthlyGoal: Math.max(0, goal) } : u
    );
    saveUsers(list);
    refresh();
  };

  type RegistryRow =
    | { type: 'unidade'; id: string; title: string; sub: string; login?: string; userId?: string; active?: boolean }
    | {
        type: 'comercial';
        id: string;
        title: string;
        sub: string;
        login: string;
        userId: string;
        active: boolean;
        monthlyGoal: number;
      };

  const registryRows: RegistryRow[] = useMemo(() => {
    const units: RegistryRow[] = licensees.map((lic) => {
      const login = licenseeUsers.find((u) => u.unitId === lic.id);
      return {
        type: 'unidade' as const,
        id: lic.id,
        title: lic.name,
        sub: `${lic.city} · ${lic.state} · ${lic.id}`,
        login: login ? `@${login.username}` : 'Sem login',
        userId: login?.id,
        active: login?.active,
      };
    });
    const comm: RegistryRow[] = commercialUsers.map((u) => ({
      type: 'comercial' as const,
      id: u.id,
      title: u.displayName,
      sub: `Meta R$ ${(u.monthlyGoal || 15000).toLocaleString('pt-BR')}/mês`,
      login: `@${u.username}`,
      userId: u.id,
      active: u.active,
      monthlyGoal: u.monthlyGoal || 15000,
    }));
    if (listFilter === 'unidades') return units;
    if (listFilter === 'comerciais') return comm;
    return [...units, ...comm];
  }, [licensees, licenseeUsers, commercialUsers, listFilter]);

  return (
    <div className="page-container-wide">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-primary-900 rounded-2xl flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text)]">Cadastro</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Unidades licenciadas e equipe comercial da rede
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setKindAndUrl('unidade')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] ${
            kind === 'unidade'
              ? 'bg-primary-900 text-white'
              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Unidade licenciada
        </button>
        <button
          type="button"
          onClick={() => setKindAndUrl('comercial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm min-h-[44px] ${
            kind === 'comercial'
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]'
          }`}
        >
          <Handshake className="w-4 h-4" />
          Comercial da rede
        </button>
      </div>

      {kind === 'unidade' ? (
        <form
          onSubmit={handleCreateUnit}
          className="app-card-dark mb-6 space-y-3"
        >
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nova unidade
          </h2>
          <input
            placeholder="Nome da unidade (ex: SP Centro)"
            value={unitForm.unitName}
            onChange={(e) => setUnitForm({ ...unitForm, unitName: e.target.value })}
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Cidade"
              value={unitForm.city}
              onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
              className="w-full border-2 rounded-xl py-3 px-3 font-medium"
              required
            />
            <input
              placeholder="UF"
              value={unitForm.state}
              onChange={(e) => setUnitForm({ ...unitForm, state: e.target.value })}
              className="w-full border-2 rounded-xl py-3 px-3 font-medium"
              maxLength={2}
              required
            />
          </div>
          <div className="relative">
            <Phone className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="WhatsApp / telefone da unidade"
              value={unitForm.phone}
              onChange={(e) => setUnitForm({ ...unitForm, phone: e.target.value })}
              className="w-full border-2 rounded-xl py-3 pl-10 pr-3 font-medium"
              inputMode="tel"
              required
            />
          </div>
          <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Acesso da unidade</p>
          <input
            placeholder="Usuário (login)"
            value={unitForm.username}
            onChange={(e) => setUnitForm({ ...unitForm, username: e.target.value })}
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <input
            type="password"
            placeholder="Senha inicial"
            value={unitForm.password}
            onChange={(e) => setUnitForm({ ...unitForm, password: e.target.value })}
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <input
            placeholder="Responsável (opcional)"
            value={unitForm.responsibleName}
            onChange={(e) => setUnitForm({ ...unitForm, responsibleName: e.target.value })}
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
          />
          <button type="submit" className="btn-primary w-full py-3.5">
            <Save className="w-5 h-5" />
            Criar unidade e login
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleCreateCommercial}
          className="app-card-dark mb-6 space-y-3"
        >
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Novo comercial
          </h2>
          <input
            placeholder="Nome completo"
            value={commercialForm.displayName}
            onChange={(e) =>
              setCommercialForm({ ...commercialForm, displayName: e.target.value })
            }
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <input
            placeholder="Login"
            value={commercialForm.username}
            onChange={(e) =>
              setCommercialForm({ ...commercialForm, username: e.target.value })
            }
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <input
            type="password"
            placeholder="Senha inicial"
            value={commercialForm.password}
            onChange={(e) =>
              setCommercialForm({ ...commercialForm, password: e.target.value })
            }
            className="w-full border-2 rounded-xl py-3 px-3 font-medium"
            required
          />
          <div>
            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase flex items-center gap-1 mb-1">
              <Target className="w-3.5 h-3.5" />
              Meta mensal individual (R$)
            </label>
            <input
              type="number"
              min={0}
              value={commercialForm.monthlyGoal}
              onChange={(e) =>
                setCommercialForm({
                  ...commercialForm,
                  monthlyGoal: Number(e.target.value) || 0,
                })
              }
              className="w-full border-2 rounded-xl py-3 px-3 font-bold"
            />
          </div>
          <button type="submit" className="btn-success w-full py-3.5">
            <Save className="w-5 h-5" />
            Cadastrar comercial
          </button>
        </form>
      )}

      {msg && (
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-4">{msg}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1 p-1 bg-[var(--color-surface-muted)] rounded-xl">
          {(
            [
              { id: 'todos' as const, label: 'Todos' },
              { id: 'unidades' as const, label: 'Unidades' },
              { id: 'comerciais' as const, label: 'Comerciais' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setListFilter(f.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold min-h-[40px] ${
                listFilter === f.id
                  ? 'bg-[var(--color-surface-elevated)] text-primary-400 shadow-sm'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <h2 className="font-bold text-[var(--color-text)] mb-3">
        Cadastros ({registryRows.length})
      </h2>

      {registryRows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] app-panel-muted py-8 text-center">
          Nenhum registro neste filtro.
        </p>
      ) : (
        <div
          className={cardsContainer(
            viewMode,
            'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          {registryRows.map((row) => (
            <div key={`${row.type}-${row.id}`} className="tempo-live-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      row.type === 'unidade'
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    }`}
                  >
                    {row.type === 'unidade' ? 'Unidade' : 'Comercial'}
                  </span>
                  <p className="tempo-live-title mt-2 truncate">{row.title}</p>
                  <p className="tempo-live-meta">{row.sub}</p>
                  {'login' in row && row.login && (
                    <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                      {row.login}
                    </p>
                  )}
                </div>
                {row.type === 'unidade' ? (
                  <Building2 className="w-8 h-8 text-[var(--color-text-subtle)] shrink-0" />
                ) : (
                  <Handshake className="w-8 h-8 text-emerald-500 shrink-0" />
                )}
              </div>

              {row.type === 'comercial' && (
                <div className="mt-3">
                  <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                    Meta R$
                  </label>
                  <input
                    type="number"
                    min={0}
                    defaultValue={row.monthlyGoal}
                    onBlur={(e) =>
                      updateCommercialGoal(row.userId, Number(e.target.value) || 0)
                    }
                    className="w-full border-2 rounded-lg py-2 px-2 font-bold text-sm mt-1"
                  />
                </div>
              )}

              {row.userId && row.type === 'comercial' && (
                <button
                  type="button"
                  onClick={() => toggleActive(row.userId)}
                  className={`mt-3 text-xs font-bold w-full py-2 rounded-lg ${
                    row.active
                      ? 'text-red-600 bg-red-50 dark:bg-red-950/30'
                      : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                  }`}
                >
                  {row.active ? 'Desativar acesso' : 'Reativar acesso'}
                </button>
              )}
              {row.userId && row.type === 'unidade' && (
                <button
                  type="button"
                  onClick={() => toggleActive(row.userId!)}
                  className="mt-3 text-xs font-bold text-[var(--color-text-muted)] w-full py-2"
                >
                  {row.active ? 'Desativar login' : 'Reativar login'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
