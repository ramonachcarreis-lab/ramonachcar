import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Timers from './pages/Timers';
import Financials from './pages/Financials';
import Login from './pages/Login';
import Logistics from './pages/Logistics';
import Settings from './pages/Settings';
import DashboardLogistics from './pages/DashboardLogistics';
import CRM from './pages/CRM';
import Licensees from './pages/Licensees';
import Unauthorized from './pages/Unauthorized';
import AgendaComercial from './pages/AgendaComercial';
import CrmComercial from './pages/CrmComercial';
import FaturamentoRede from './pages/FaturamentoRede';
import SalesDashboard from './pages/SalesDashboard';
import CommercialProfilePage from './pages/CommercialProfile';
import TempoComercial from './pages/TempoComercial';
import CrmRegisterClient from './pages/CrmRegisterClient';
import AdminPanel from './pages/AdminPanel';
import PublicEvaluation from './pages/PublicEvaluation';
import PublicSignature from './pages/PublicSignature';
import PublicServiceSignature from './pages/PublicServiceSignature';
import PublicServiceStatus from './pages/PublicServiceStatus';
import PublicClientPortal from './pages/PublicClientPortal';
import InstallApp from './pages/InstallApp';

import { SettingsProvider } from './context/SettingsContext';
import { CommercialProfileProvider } from './context/CommercialProfileContext';
import { EventsProvider } from './context/EventsContext';
import { FinancialsProvider } from './context/FinancialsContext';
import { TimersProvider } from './context/TimersContext';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { LicenseesProvider } from './context/LicenseesContext';
import { EvaluationsProvider } from './context/EvaluationsContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingShell from './components/ui/LoadingShell';
import { useNotificationSync } from './hooks/useNotificationSync';
import { seedDemoEvaluationsIfEmpty } from './services/evaluationDemoSeed';
import { seedAdminPreviewEventsIfMissing } from './services/adminPreviewSeed';

import { syncLoyaltyRecordsToServer } from './utils/loyaltyPoints';

try {
  seedDemoEvaluationsIfEmpty();
  seedAdminPreviewEventsIfMissing();
  syncLoyaltyRecordsToServer();
} catch {
  /* evita tela branca se localStorage estiver bloqueado */
}

function ProtectedLayout() {
  const { session, loading } = useAuth();
  useNotificationSync();
  if (loading) return <LoadingShell />;
  if (!session) return <Navigate to="/login" replace />;
  return <Layout />;
}

function RequireRole({
  allowed,
  children,
}: {
  allowed: UserRole[];
  children: React.ReactNode;
}) {
  const { session } = useAuth();
  const ok =
    session && (session.role === 'admin' || allowed.includes(session.role));
  if (!ok) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}

function DashboardByRole() {
  const { session } = useAuth();
  if (session?.role === 'admin') return <Navigate to="/sales-dashboard" replace />;
  if (session?.role === 'commercial') return <Navigate to="/sales-dashboard" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <AuthProvider>
      <CommercialProfileProvider>
      <LicenseesProvider>
      <SettingsProvider>
          <FinancialsProvider>
        <EventsProvider>
          <EvaluationsProvider>
            <TimersProvider>
              <BrowserRouter>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/avaliacao/:token" element={<PublicEvaluation />} />
                    <Route path="/assinatura/:token" element={<PublicSignature />} />
                    <Route path="/assinatura-servico/:token" element={<PublicServiceSignature />} />
                    <Route path="/servico/:token" element={<PublicServiceStatus />} />
                    <Route path="/cliente/:token" element={<PublicClientPortal />} />
                    <Route path="/instalar" element={<InstallApp />} />
                    <Route path="/instalar-app" element={<InstallApp />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    <Route element={<ProtectedLayout />}>
                      <Route path="/dashboard" element={<DashboardByRole />} />

                      <Route
                        path="/admin"
                        element={
                          <RequireRole allowed={['admin']}>
                            <AdminPanel />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/admin-comercial"
                        element={<Navigate to="/admin?tipo=comercial" replace />}
                      />
                      <Route
                        path="/sales-dashboard"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <SalesDashboard />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/agenda-comercial"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <AgendaComercial />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/tempo-comercial"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <TempoComercial />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/operacao"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <TempoComercial />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/faturamento-rede"
                        element={
                          <RequireRole allowed={['commercial', 'admin']}>
                            <FaturamentoRede />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/financas-comercial"
                        element={<Navigate to="/faturamento-rede" replace />}
                      />
                      <Route
                        path="/crm-comercial"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <CrmComercial />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/crm-comercial/cadastro"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <CrmRegisterClient />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/licenciados"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <Licensees />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/perfil-comercial"
                        element={
                          <RequireRole allowed={['commercial']}>
                            <CommercialProfilePage />
                          </RequireRole>
                        }
                      />

                      <Route
                        path="/agenda"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <Agenda />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/tempo"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <Timers />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/financas"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <Financials />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/crm"
                        element={
                          <RequireRole allowed={['licensee', 'commercial']}>
                            <CRM />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/crm/cadastro"
                        element={
                          <RequireRole allowed={['licensee', 'commercial']}>
                            <CrmRegisterClient />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/logistica"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <DashboardLogistics />
                          </RequireRole>
                        }
                      />

                      <Route
                        path="/calculadora-logistica"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <Logistics />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/novo-contrato"
                        element={
                          <RequireRole allowed={['licensee', 'commercial', 'admin']}>
                            <Navigate to="/crm" replace state={{ quickRegister: true, contractEntry: true }} />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="/configuracoes"
                        element={
                          <RequireRole allowed={['licensee']}>
                            <Settings />
                          </RequireRole>
                        }
                      />
                    </Route>
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TimersProvider>
          </EvaluationsProvider>
        </EventsProvider>
          </FinancialsProvider>
      </SettingsProvider>
      </LicenseesProvider>
      </CommercialProfileProvider>
    </AuthProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
