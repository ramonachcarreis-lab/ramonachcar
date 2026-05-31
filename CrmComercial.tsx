import { Navigate } from 'react-router-dom';

/** CRM comercial unificado em /crm (abas Negócios · Oportunidades · Clientes). */
export default function CrmComercial() {
  return <Navigate to="/crm" replace />;
}
