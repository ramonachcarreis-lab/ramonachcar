import { useState, useMemo, useRef, useEffect } from 'react';
import { useViewMode } from '../hooks/useViewMode';
import ViewModeToggle from '../components/ViewModeToggle';
import { APP_VIEW_MODE_KEY, cardsContainer, cardsContainerDense } from '../utils/viewModeLayout';
import {
  Users,
  Search,
  MessageCircle,
  Calendar,
  Gift,
  MapPin,
  X,
  Download,
  UserPlus,
  Upload,
  ClipboardList,
  Building2,
  Handshake,
} from 'lucide-react';
import { loadUsers, saveUsers } from '../services/usersStorage';
import CrmImportModal from '../components/CrmImportModal';
import ClubePlayPanel from '../components/ClubePlayPanel';
import { loadLoyaltyRecords } from '../utils/loyaltyPoints';
import { buildClubePlayView, clubePlaySummaryLabel } from '../utils/clubePlay';
import ClubePlayBadge from '../components/ClubePlayBadge';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEvents, AppEvent } from '../context/EventsContext';
import { useToast } from '../context/ToastContext';
import { SkeletonDealGrid } from '../components/ui/Skeleton';
import { findReturningClients } from '../utils/returningClients';
import CrmDealPanel from '../components/CrmDealPanel';
import CrmQuickRegisterModal, { type QuickRegisterPrefill } from '../components/CrmQuickRegisterModal';
import { generateBulletproofPDF } from '../utils/pdfGenerator';
import { ReportTemplate, ReportTemplateData } from '../components/ReportTemplate';
import { getWhatsAppLink } from '../utils/formatters';
import { buildOpportunityWhatsAppLink } from '../utils/crmOpportunityMessage';
import { formatCrmDealTitle, formatCrmDealSubtitle } from '../utils/dealVisual';
import { formatLeadTitle } from '../utils/eventTypes';
import CrmDealCardVisual from '../components/CrmDealCardVisual';
import { useSettings } from '../context/SettingsContext';
import { buildUnitCatalog } from '../utils/units';
import { useAuth } from '../context/AuthContext';
import { useCommercialProfile } from '../context/CommercialProfileContext';
import { findFidelityOpportunities } from '../utils/loyaltyOpportunities';
import ClientDetailModal, { type ClientDetailData } from '../components/ClientDetailModal';
import { crmDealAuthorLabel, isCrmDealViewOnly } from '../utils/crmAccess';
import { matchesSearch } from '../utils/searchNormalize';
import SearchableUnitSelect from '../components/SearchableUnitSelect';
import { getEffectiveCrmStep } from '../utils/crmFlow';
import { crmDealStatusBadgeClass } from '../utils/crmStatusBadge';
import { DATE_HOLD_LABELS, resolveDateHoldStatus } from '../utils/dateHold';
import { CRM_FLOW_LABELS } from '../types/crm';
import { buildClientProfiles } from '../utils/crmClients';
import { UNITS, getUnitById } from '../utils/units';
import { dealHandlerLabel } from '../utils/displayLabels';
import { useLicensees } from '../context/LicenseesContext';
import CrmClientExportBar from '../components/CrmClientExportBar';
import CrmFiltersBar from '../components/CrmFiltersBar';
import CommercialFinancePanel from '../components/CommercialFinancePanel';
import { buildMaintenanceWhatsAppLink } from '../utils/crmOpportunityMessage';
import { MAINTENANCE_DAYS_BEFORE_YEAR } from '../utils/returningClients';
import {
  filterCrmDeals,
  filterClientsByClass,
  isCrmDealClosed,
  type DealPipelineFilter,
  type DealChannelFilter,
} from '../utils/crmFilters';
import { filterActiveUnits } from '../utils/excludedUnits';
import type { ClientDealClass } from '../utils/clientExport';

export default function CRM() {
  const navigate = useNavigate();
  const location = useLocation();
  const { events, fieldHydrating } = useEvents();
  const toast = useToast();
  const { getUnitEquipments } = useSettings();
  const { session } = useAuth();
  const { profile: commercialProfile } = useCommercialProfile();
  const { licensees } = useLicensees();
  const isCommercial = session?.role === 'commercial';
  const isAdmin = session?.role === 'admin';
  const commercialDisplayName = session?.name || commercialProfile.name;
  const [selectedDeal, setSelectedDeal] = useState<AppEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pago' | 'Pendente' | 'Cancelado'>('Todos');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'Mensal' | 'Anual'>('Mensal');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<
    'negocios' | 'clube-play' | 'oportunidades' | 'clientes'
  >('negocios');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<DealChannelFilter>('all');
  const [commercialPersonFilter, setCommercialPersonFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [pipelineFilter, setPipelineFilter] = useState<DealPipelineFilter>(
    isAdmin ? 'em_andamento' : 'todos'
  );
  const [clientClassFilter, setClientClassFilter] = useState<'Todos' | ClientDealClass>('Todos');
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegisterPrefill, setQuickRegisterPrefill] = useState<QuickRegisterPrefill | undefined>();
  const [contractEntryHint, setContractEntryHint] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const isLicensee = session?.role === 'licensee';
  const loyaltyRecords = useMemo(() => loadLoyaltyRecords(), [events]);
  const { mode: crmViewMode, setMode: setCrmViewMode } = useViewMode('grid', APP_VIEW_MODE_KEY);
  const reportRef = useRef<HTMLDivElement>(null);
  const unitId = session?.unitId || 'sp-centro';

  const crmGridClass = cardsContainer(crmViewMode);
  const crmOppGridClass = cardsContainerDense(crmViewMode);

  const unitOptions = useMemo(() => {
    const list = filterActiveUnits(licensees.length ? licensees : UNITS);
    return list.map((u) => ({
      id: u.id,
      label: 'name' in u && u.name ? u.name : getUnitById(u.id).name,
      sublabel: 'city' in u && u.city ? `${u.city}` : u.id,
    }));
  }, [licensees]);

  const commercialOptions = useMemo(() => {
    const fromUsers = loadUsers()
      .filter((u) => u.role === 'commercial' && u.active)
      .map((u) => ({ value: u.displayName, label: u.displayName }));
    const fromEvents = new Set<string>();
    events.forEach((e) => {
      if (e.managedByCommercial?.trim()) fromEvents.add(e.managedByCommercial.trim());
    });
    fromEvents.forEach((name) => {
      if (!fromUsers.some((o) => o.value === name)) {
        fromUsers.push({ value: name, label: name });
      }
    });
    return fromUsers;
  }, [events]);

  const crmDeals = useMemo(
    () =>
      filterCrmDeals(events, {
        isCommercial,
        isAdmin,
        commercialName: commercialDisplayName,
        unitId,
        unitFilter,
        channelFilter: isCommercial ? 'all' : channelFilter,
        commercialPersonFilter: isCommercial ? 'all' : commercialPersonFilter,
        stepFilter,
        pipelineFilter,
      }),
    [
      events,
      isCommercial,
      isAdmin,
      commercialDisplayName,
      unitId,
      unitFilter,
      channelFilter,
      commercialPersonFilter,
      stepFilter,
      pipelineFilter,
    ]
  );

  const adminCommercials = useMemo(() => {
    if (!isAdmin) return [];
    return loadUsers()
      .filter((u) => u.role === 'commercial' && u.active)
      .map((u) => ({
        id: u.id,
        name: u.displayName,
        goal: u.monthlyGoal || 15000,
      }));
  }, [isAdmin, events]);

  const updateAdminCommercialGoal = (userId: string, goal: number) => {
    const list = loadUsers().map((u) =>
      u.id === userId ? { ...u, monthlyGoal: Math.max(0, goal) } : u
    );
    saveUsers(list);
  };

  const licenseeNegotiationCount = useMemo(() => {
    if (!isAdmin) return 0;
    return events.filter(
      (e) =>
        e.status === 'pending' &&
        e.creatorRole === 'licensee' &&
        !e.managedByCommercial?.trim()
    ).length;
  }, [events, isAdmin]);

  const dealStatusLabel = (deal: AppEvent) => {
    const step = getEffectiveCrmStep(deal);
    if (step === 'closed' || step === 'paid' || deal.status === 'confirmed') {
      return 'Contrato fechado';
    }
    return CRM_FLOW_LABELS[step] || 'Em andamento';
  };

  const isDealClosed = isCrmDealClosed;

  const pendingNavRef = useRef<{
    openDealId?: number;
    tab?: typeof activeTab;
    quickRegister?: boolean;
    contractEntry?: boolean;
    prefill?: QuickRegisterPrefill;
    channelFilter?: DealChannelFilter;
    commercialPersonFilter?: string;
    pipeline?: DealPipelineFilter;
  } | null>(null);

  useEffect(() => {
    const state = location.state as typeof pendingNavRef.current;
    if (!state || typeof state !== 'object' || !Object.keys(state).length) return;
    pendingNavRef.current = { ...pendingNavRef.current, ...state };
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const state = pendingNavRef.current;
    if (!state) return;

    if (state.tab) setActiveTab(state.tab);
    if (state.quickRegister && !isAdmin) {
      setShowQuickRegister(true);
      if (state.prefill) setQuickRegisterPrefill(state.prefill);
    }
    if (state.contractEntry) setContractEntryHint(true);
    if (state.commercialPersonFilter) {
      setChannelFilter('commercial');
      setCommercialPersonFilter(state.commercialPersonFilter);
    }
    if (state.channelFilter) setChannelFilter(state.channelFilter);
    if (state.pipeline) setPipelineFilter(state.pipeline);

    if (state.openDealId) {
      if (fieldHydrating) return;
      const ev = events.find((e) => e.id === state.openDealId);
      if (ev) {
        setSelectedDeal(ev);
        setActiveTab('negocios');
      }
    }

    pendingNavRef.current = null;
  }, [events, fieldHydrating, isAdmin]);

  useEffect(() => {
    if (!selectedDeal) return;
    const fresh = events.find((e) => e.id === selectedDeal.id);
    if (fresh) setSelectedDeal(fresh);
  }, [events, selectedDeal?.id]);

  const scopedEvents = useMemo(
    () =>
      events.filter((e) =>
        isCommercial || isAdmin ? true : (e.unitId || 'sp-centro') === unitId
      ),
    [events, unitId, isCommercial, isAdmin]
  );

  const clientHistory = useMemo(
    () => buildClientProfiles(scopedEvents),
    [scopedEvents]
  );

  const returningClients = useMemo(
    () => findReturningClients(scopedEvents),
    [scopedEvents]
  );

  const fidelityOpportunities = useMemo(
    () => findFidelityOpportunities(events, isCommercial ? undefined : unitId),
    [events, unitId, isCommercial]
  );

  const [clientDetail, setClientDetail] = useState<ClientDetailData | null>(null);

  const openClientFromHistory = (client: (typeof clientHistory)[0]) => {
    setClientDetail({
      name: client.name,
      phone: client.phone,
      totalSpent: client.totalSpent,
      rentalsCount: client.rentalsCount,
      equipments: [...client.equipments],
      events: client.events,
      unitId: client.lastUnitId,
    });
  };

  const openClientFromReturning = (rc: (typeof returningClients)[0]) => {
    const evs = scopedEvents.filter(
      (e) => e.client === rc.clientName && e.phone === rc.phone
    );
    setClientDetail({
      name: rc.clientName,
      phone: rc.phone,
      totalSpent: evs.reduce((s, e) => s + (e.totalValue || 0), 0),
      rentalsCount: evs.filter((e) => e.financialStatus === 'Pago').length,
      equipments: rc.lastEquipments,
      events: evs,
      unitId: rc.unitId || unitId,
      honoreeName: rc.honoreeName,
      eventType: rc.eventType,
      eventDetail: rc.eventDetail,
      daysUntilAnniversary: rc.daysUntilAnniversary,
      maintenanceItems: rc.maintenanceItems,
    });
  };

  const openClientFromFidelity = (f: (typeof fidelityOpportunities)[0]) => {
    const evs = scopedEvents.filter(
      (e) => e.client === f.clientName && e.phone === f.phone
    );
    setClientDetail({
      name: f.clientName,
      phone: f.phone,
      totalSpent: f.totalSpent,
      rentalsCount: f.rentalsCount,
      equipments: [...new Set(evs.flatMap((e) => e.equipments))],
      events: evs,
      unitId: f.unitId,
    });
  };

  const filteredByClass = useMemo(
    () => filterClientsByClass(clientHistory, clientClassFilter),
    [clientHistory, clientClassFilter]
  );

  const filteredHistory = filteredByClass.filter((client) => {
    const matchesQuery = matchesSearch(
      searchTerm,
      client.name,
      client.phone,
      client.lastUnitName,
      client.lastCommercialManager,
      client.lastEventAddress,
      ...[...client.equipments]
    );
    const matchesUnit =
      (!isCommercial && !isAdmin) ||
      unitFilter === 'all' ||
      client.lastUnitId === unitFilter;

    if (!matchesUnit) return false;

    if (!matchesQuery) return false;

    if (statusFilter === 'Todos') return true;

    if (statusFilter === 'Cancelado') {
      return client.lastEventStatus === 'cancelled';
    }

    return (
      client.lastEventStatus !== 'cancelled' &&
      client.lastEventFinancialStatus === statusFilter
    );
  });

  const handleGenerateReport = async () => {
    if (!reportRef.current) return;
    setIsGeneratingReport(true);
    try {
      const monthName = new Date(reportYear, reportMonth).toLocaleString('pt-BR', { month: 'long' });
      const fileName = reportType === 'Mensal' 
        ? `Relatorio_EstofadoPro_${monthName}_${reportYear}`
        : `Relatorio_EstofadoPro_Anual_${reportYear}`;
      await generateBulletproofPDF(reportRef.current, fileName);
      setShowReportModal(false);
    } catch (error) {
      console.error('Failed to generate report', error);
      toast.error('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Generate Report Data
  const reportData = useMemo<ReportTemplateData>(() => {
    const targetEvents = events.filter((e) => {
      if (!isCommercial && !isAdmin && (e.unitId || 'sp-centro') !== unitId) return false;
      const d = new Date(e.date);
      if (reportType === 'Mensal') {
        return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
      }
      return d.getFullYear() === reportYear;
    });

    const totalRentals = targetEvents.length;
    const totalIncome = targetEvents
      .filter(e => e.financialStatus === 'Pago' && e.status !== 'cancelled')
      .reduce((acc, e) => acc + (e.totalValue || 0), 0);
    const totalPending = targetEvents
      .filter(e => e.financialStatus === 'Pendente' && e.status !== 'cancelled')
      .reduce((acc, e) => acc + (e.totalValue || 0), 0);
    const totalCancelled = targetEvents.filter(e => e.status === 'cancelled').length;

    const equipmentCounts: Record<string, number> = {};
    targetEvents.forEach(e => {
      if (e.status !== 'cancelled') {
        e.equipments.forEach(eq => {
          equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
        });
      }
    });

    const topEquipments = Object.entries(equipmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentEvents = targetEvents
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(e => ({
        date: new Date(e.date).toLocaleDateString('pt-BR'),
        client: e.client,
        value: e.totalValue || 0,
        status: e.status === 'cancelled' ? 'Cancelado' : e.financialStatus
      }));

    return {
      month: reportType === 'Mensal' ? new Date(reportYear, reportMonth).toLocaleString('pt-BR', { month: 'long' }) : 'Anual',
      year: reportYear.toString(),
      totalRentals,
      totalIncome,
      totalPending,
      totalCancelled,
      topEquipments,
      recentEvents
    };
  }, [events, reportType, reportMonth, reportYear, isCommercial, isAdmin, unitId]);

  return (
    <div className="page-container pt-8 pb-24">
      {/* Hidden Report Template */}
      <div className="overflow-hidden h-0 w-0 absolute opacity-0 pointer-events-none">
        <ReportTemplate ref={reportRef} data={reportData} />
      </div>

      <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="page-heading text-2xl sm:text-3xl flex items-center gap-2">
            {isAdmin ? (
              <ClipboardList className="w-8 h-8 text-primary-500 shrink-0" />
            ) : null}
            {isAdmin ? 'Controle Comercial' : 'CRM & Clientes'}
          </h1>
          <p className="text-[var(--color-text-muted)] font-medium text-sm">
            {isAdmin
              ? 'Metas individuais · negociações por comercial e licenciado'
              : 'Cadastro · proposta · contrato · reativação'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {isLicensee && (
            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center gap-2 border-2 border-primary-200 text-primary-800 font-bold py-3 px-4 rounded-xl hover:bg-primary-50"
            >
              <Upload className="w-4 h-4" />
              Importar CRM
            </button>
          )}
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setShowQuickRegister(true)}
              className="btn-primary py-3 px-4"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar cliente
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin?tipo=comercial')}
              className="btn-outline py-3 px-4"
            >
              <UserPlus className="w-4 h-4" />
              Novo comercial
            </button>
          )}
        </div>
      </header>

      {isAdmin && (
        <section className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="app-panel-muted !py-2 px-3 flex items-center gap-1">
              <Handshake className="w-4 h-4 text-primary-400" />
              {crmDeals.length} negócios no filtro
            </span>
            {licenseeNegotiationCount > 0 && (
              <span className="app-panel-muted !py-2 px-3 flex items-center gap-1">
                <Building2 className="w-4 h-4 text-amber-400" />
                {licenseeNegotiationCount} neg. das unidades (licenciado)
              </span>
            )}
          </div>
          <CommercialFinancePanel
            events={events}
            commercials={adminCommercials}
            selectedCommercial={commercialPersonFilter}
            onSelectCommercial={(name) => {
              setChannelFilter('commercial');
              setCommercialPersonFilter(name);
            }}
            onUpdateGoal={updateAdminCommercialGoal}
          />
        </section>
      )}
      {showImport && <CrmImportModal onClose={() => setShowImport(false)} />}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
        {(
          [
            { id: 'negocios' as const, label: 'Negócios', count: crmDeals.length },
            {
              id: 'clube-play' as const,
              label: 'Clube Panda',
              count: loyaltyRecords.filter((r) =>
                isCommercial ? true : r.unitId === unitId
              ).length,
            },
            {
              id: 'oportunidades' as const,
              label: 'Oportunidades',
              count: returningClients.length + fidelityOpportunities.length,
            },
            { id: 'clientes' as const, label: 'Clientes', count: clientHistory.length },
          ]
        ).map((tab) => {
          const isClube = tab.id === 'clube-play';
          const active = activeTab === tab.id;
          return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-black transition-colors min-h-[44px] ${
              active
                ? isClube
                  ? 'bg-orange-950/70 text-orange-300 border border-orange-800/60 shadow-sm'
                  : 'bg-[var(--color-surface-elevated)] text-primary-400 shadow-sm'
                : isClube
                  ? 'text-orange-400/90 hover:text-orange-300'
                  : 'text-[var(--color-text-muted)]'
            }`}
          >
            {tab.label}
            {tab.count > 0 ? (
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isClube
                    ? 'bg-orange-900/80 text-orange-200'
                    : 'bg-primary-950/80 text-primary-300'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
          );
        })}
      </div>

      {activeTab === 'negocios' && (
      <section className="mb-8">
        <CrmFiltersBar
          mode="deals"
          unitOptions={unitOptions}
          unitFilter={unitFilter}
          onUnitFilter={setUnitFilter}
          showUnitFilter={isAdmin || isCommercial}
          channelFilter={isAdmin ? channelFilter : undefined}
          onChannelFilter={isAdmin ? setChannelFilter : undefined}
          commercialPersonOptions={isAdmin ? commercialOptions : undefined}
          commercialPersonFilter={commercialPersonFilter}
          onCommercialPersonFilter={isAdmin ? setCommercialPersonFilter : undefined}
          stepFilter={stepFilter}
          onStepFilter={setStepFilter}
          pipelineFilter={pipelineFilter}
          onPipelineFilter={setPipelineFilter}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Negócios</h2>
          <ViewModeToggle mode={crmViewMode} onChange={setCrmViewMode} />
        </div>
        {fieldHydrating ? (
          <SkeletonDealGrid count={crmViewMode === 'list' ? 4 : 6} />
        ) : crmDeals.length === 0 ? (
          <div className="empty-state-panel">
            <p className="font-medium text-sm">Nenhum negócio ainda. Cadastre um cliente para começar.</p>
          </div>
        ) : (
          <div className={crmGridClass}>
            {crmDeals.map((deal) => {
              const closed = isDealClosed(deal);
              const dealCatalog = buildUnitCatalog(
                deal.unitId || 'sp-centro',
                getUnitEquipments(deal.unitId || 'sp-centro')
              ).equipments;
              const statusBadge = (
                <span className={`shrink-0 ${crmDealStatusBadgeClass(deal)}`}>
                  {dealStatusLabel(deal)}
                </span>
              );
              return (
              <button
                key={deal.id}
                type="button"
                onClick={() => setSelectedDeal(deal)}
                className={`crm-deal-card ${
                  closed ? 'crm-deal-card--closed' : ''
                } ${
                  crmViewMode === 'list'
                    ? 'p-3 flex flex-wrap items-center gap-3 sm:gap-4'
                    : 'p-4 relative'
                }`}
              >
                {crmViewMode === 'list' && (
                  <CrmDealCardVisual deal={deal} catalog={dealCatalog} layout="list" />
                )}
                {crmViewMode === 'grid' && (
                  <span className="absolute top-3 right-3 z-[1]">{statusBadge}</span>
                )}
                <div className={crmViewMode === 'list' ? 'flex-1 min-w-0' : ''}>
                  {crmViewMode === 'grid' && (
                    <CrmDealCardVisual deal={deal} catalog={dealCatalog} layout="grid" />
                  )}
                  <p
                    className={`font-bold text-data truncate ${crmViewMode === 'grid' ? 'pr-24' : ''}`}
                  >
                    {formatCrmDealTitle(deal)}
                  </p>
                  <p className="text-xs text-caption mt-0.5">
                    {formatCrmDealSubtitle(deal)}
                    {' · '}
                    {new Date(deal.date).toLocaleDateString('pt-BR')} · {deal.time}
                  </p>
                  {(() => {
                    const hold = resolveDateHoldStatus(deal);
                    if (hold === 'none') return null;
                    return (
                      <p
                        className={`text-[10px] font-bold mt-1 ${
                          hold === 'closed'
                            ? 'text-emerald-700'
                            : hold === 'reserved'
                              ? 'text-orange-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {DATE_HOLD_LABELS[hold]}
                      </p>
                    );
                  })()}
                  {isAdmin && (
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                      {getUnitById(deal.unitId || 'sp-centro').name} · {dealHandlerLabel(deal)}
                    </p>
                  )}
                  {crmViewMode === 'grid' && closed && (
                    <p className="text-xs font-bold text-emerald-700 mt-2">
                      R$ {(deal.totalValue || 0).toFixed(2)}
                      {deal.financialStatus === 'Pago' ? ' · Pago' : ' · A receber'}
                    </p>
                  )}
                  {crmViewMode === 'grid' && !closed && deal.contactLog?.length ? (
                    <p className="text-xs text-amber-700 mt-2 line-clamp-2">
                      {deal.contactLog[deal.contactLog.length - 1].text}
                    </p>
                  ) : null}
                </div>
                {crmViewMode === 'list' && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {statusBadge}
                    {closed && (
                      <p className="text-xs font-bold text-emerald-700">
                        R$ {(deal.totalValue || 0).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
            })}
          </div>
        )}
      </section>
      )}

      {selectedDeal && (
        <CrmDealPanel
          event={selectedDeal}
          authorLabel={crmDealAuthorLabel(
            session?.role || 'licensee',
            isCommercial ? commercialDisplayName : undefined
          )}
          readOnly={
            session?.role
              ? isCrmDealViewOnly(
                  selectedDeal,
                  session.role,
                  unitId,
                  isCommercial ? commercialDisplayName : undefined
                ) ||
                (session.role === 'licensee' && isDealClosed(selectedDeal))
              : false
          }
          onClose={() => setSelectedDeal(null)}
          onPaid={() => {
            const fresh = events.find((e) => e.id === selectedDeal?.id);
            if (fresh) setSelectedDeal(fresh);
          }}
        />
      )}

      {showQuickRegister && (
        <CrmQuickRegisterModal
          prefill={quickRegisterPrefill}
          onClose={() => {
            setShowQuickRegister(false);
            setContractEntryHint(false);
            setQuickRegisterPrefill(undefined);
          }}
          contractEntry={contractEntryHint}
          onCreated={(ev) => {
            setShowQuickRegister(false);
            setQuickRegisterPrefill(undefined);
            setSelectedDeal(ev);
            setActiveTab('negocios');
            setContractEntryHint(false);
          }}
        />
      )}

      {activeTab === 'clube-play' && (
        <section className="mb-8">
          <ClubePlayPanel
            unitId={isLicensee ? unitId : unitFilter === 'all' ? 'all' : unitFilter}
            networkView={isCommercial || isAdmin}
            onOpenClient={setClientDetail}
          />
        </section>
      )}

      {activeTab === 'oportunidades' && (
      <section className="mb-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-accent-coral" />
            <h2 className="text-lg font-bold text-slate-800">Oportunidades</h2>
          </div>
          <ViewModeToggle mode={crmViewMode} onChange={setCrmViewMode} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Manutenção anual: aviso ~{MAINTENANCE_DAYS_BEFORE_YEAR} dias antes de completar 1 ano por item
          (sofá, colchão, etc.) — mensagem sugere higienização de manutenção.
        </p>

        {(returningClients.length === 0 && fidelityOpportunities.length === 0) ? (
          <div className="bg-slate-50 border border-slate-100 border-dashed rounded-2xl p-6 text-center">
            <p className="text-slate-500 font-medium text-sm">Nenhuma oportunidade no momento.</p>
          </div>
        ) : (
          <div className={crmOppGridClass}>
            {returningClients.map((rc) => (
              <div
                key={`${rc.clientName}-${rc.phone}`}
                className={`text-left app-panel border border-[#FF6B4A33] relative overflow-hidden w-full ${
                  crmViewMode === 'list' ? 'p-3 flex flex-wrap items-center gap-3' : 'p-4'
                }`}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-coral" />
                <div className="flex justify-between items-start mb-2 gap-2 w-full">
                  <h3 className="font-bold text-[var(--color-text)]">
                    {formatLeadTitle(rc.eventType, rc.honoreeName, rc.clientName)}
                  </h3>
                  <span className="bg-[#FF6B4A1A] text-accent-coral text-[10px] font-bold px-2 py-1 rounded-full uppercase shrink-0">
                    1 ano em {rc.daysUntilAnniversary}d
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mb-1 w-full">
                  <Calendar className="w-3 h-3" />
                  Ciclo de manutenção · ~{MAINTENANCE_DAYS_BEFORE_YEAR} dias antes do aniversário do serviço
                </p>
                <ul className="text-xs text-[var(--color-text)] font-medium mb-3 space-y-1 w-full">
                  {rc.maintenanceItems.map((it) => (
                    <li key={it.itemName}>
                      <span className="font-bold">{it.itemName}</span> — último{' '}
                      {it.lastServiceDate.toLocaleDateString('pt-BR')} · aviso em {it.daysUntilAnniversary}d
                    </li>
                  ))}
                </ul>
                <div className={`flex gap-2 w-full ${crmViewMode === 'list' ? '' : 'flex-col'}`}>
                  <a
                    href={buildMaintenanceWhatsAppLink(rc.clientName, rc.phone, rc.maintenanceItems, {
                      eventType: rc.eventType,
                      daysUntil: rc.daysUntilAnniversary,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-[#25D366] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm no-underline min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp manutenção
                  </a>
                  <button
                    type="button"
                    onClick={() => openClientFromReturning(rc)}
                    className="btn-secondary flex-1 py-3 text-sm min-h-[44px]"
                  >
                    Ver cliente
                  </button>
                </div>
              </div>
            ))}
            {fidelityOpportunities.map((f) => (
              <button
                type="button"
                key={`fid-${f.clientName}-${f.phone}`}
                onClick={() => openClientFromFidelity(f)}
                className={`text-left bg-white rounded-2xl border border-primary-200 shadow-sm relative overflow-hidden hover:shadow-md w-full ${
                  crmViewMode === 'list' ? 'p-3 flex flex-wrap items-center gap-3' : 'p-4'
                }`}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-600" />
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800">{f.clientName}</h3>
                  <span className="bg-primary-100 text-primary-800 text-[10px] font-bold px-2 py-1 rounded-full">
                    {f.rentalsCount} loc.
                  </span>
                </div>
                <p className="text-xs font-bold text-primary-700 mb-2">
                  {clubePlaySummaryLabel(
                    buildClubePlayView(f.phone, f.clientName, f.unitId, events, loyaltyRecords)
                  )}
                </p>
                <p className="text-xs text-slate-500">Cliente fiel — ver no Clube Panda</p>
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {activeTab === 'clientes' && (
      <section>
        {(isCommercial || isAdmin) && (
          <CrmClientExportBar commercialName={commercialDisplayName} />
        )}
        <CrmFiltersBar
          mode="clients"
          unitOptions={unitOptions}
          unitFilter={unitFilter}
          onUnitFilter={setUnitFilter}
          showUnitFilter={isAdmin || isCommercial}
          clientClassFilter={clientClassFilter}
          onClientClassFilter={setClientClassFilter}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-bold text-slate-800">Clientes</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle mode={crmViewMode} onChange={setCrmViewMode} />
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Relatório financeiro
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar cliente, telefone, unidade ou equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>

        {(isCommercial || isAdmin) && (
          <SearchableUnitSelect
            value={unitFilter}
            onChange={setUnitFilter}
            options={(licensees.length ? licensees : UNITS).map((u) => ({
              id: u.id,
              label: u.name,
              sublabel: 'city' in u && u.city ? `${u.city}` : u.id,
            }))}
            className="mb-3"
          />
        )}

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {(['Todos', 'Pago', 'Pendente', 'Cancelado'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-primary-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className={crmViewMode === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          {filteredHistory.length === 0 ? (
            <div className={`text-center py-8 text-slate-400 ${crmViewMode === 'grid' ? 'col-span-full' : ''}`}>
              <p className="font-medium">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            filteredHistory.map((client, index) => {
              const now = new Date();
              const isOverdue = client.lastEventStatus !== 'cancelled' && client.lastEventFinancialStatus === 'Pendente' && client.lastRental < now;
              const clubeView = buildClubePlayView(
                client.phone,
                client.name,
                client.lastUnitId,
                client.events,
                loyaltyRecords
              );

              return (
                <div 
                  key={index} 
                  className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 cursor-pointer hover:border-primary-200 transition-colors"
                  onClick={() => openClientFromHistory(client)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{client.name}</h3>
                      <p className="text-xs text-slate-500 font-medium mb-1">{client.phone}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{client.lastEventAddress}</span>
                      </div>
                      {isCommercial && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {client.lastCommercialManager}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              client.dealClosed
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {client.dealClosed ? 'Fechado' : 'Em aberto'}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-50 text-primary-800">
                            {client.lastUnitName}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-1 ${
                        client.lastEventStatus === 'cancelled' 
                          ? 'bg-red-50 text-red-600' 
                          : client.lastEventFinancialStatus === 'Pago'
                            ? 'bg-green-50 text-green-600'
                            : isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {client.lastEventStatus === 'cancelled' ? 'Cancelado/Desistiu' : isOverdue ? 'Pendente (Atrasado)' : client.lastEventFinancialStatus}
                      </span>
                      <p className="text-sm font-black text-primary-900">R$ {client.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    <ClubePlayBadge view={clubeView} compact />
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Último serviço</p>
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {client.lastRental.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      )}

      {clientDetail && (
        <ClientDetailModal client={clientDetail} onClose={() => setClientDetail(null)} />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0f172a99] backdrop-blur-sm p-0 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-sm max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-slate-100 shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-slate-800 leading-tight">Gerar Relatório</h2>
                <p className="text-slate-500 font-medium text-sm">Escolha o período do relatório</p>
              </div>
              <button 
                onClick={() => setShowReportModal(false)}
                className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReportType('Mensal')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    reportType === 'Mensal' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('Anual')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    reportType === 'Anual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Anual
                </button>
              </div>

              <div className="space-y-4">
                {reportType === 'Mensal' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mês</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>
                          {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ano</label>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
              <button 
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="w-full bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-800 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {isGeneratingReport ? 'Gerando...' : 'Baixar Relatório'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
