import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Cadastro completo agora é proposta dentro do card do cliente no CRM. */
export default function CrmRegisterClient() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/crm', { replace: true, state: { quickRegister: true } });
  }, [navigate]);

  return null;
}
