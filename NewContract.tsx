import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateBulletproofPDF } from '../utils/pdfGenerator';
import { FileText, ArrowLeft, Phone, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useEvents } from '../context/EventsContext';
import { clsx } from 'clsx';
import { ContractTemplate } from '../components/ContractTemplate';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../context/AuthContext';
import { buildUnitCatalog, UNITS } from '../utils/units';
import { TIME_SLOTS, formatRangeFromSlot, type TimeSlotId } from '../utils/timeSlots';
import { getNextEventId } from '../services/eventsStorage';
import { buildClientWhatsAppLink, buildLicenseeWhatsAppLink } from '../utils/whatsapp';

const googleLibraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

export default function NewContract() {
  const navigate = useNavigate();
  const { settings, getUnitEquipments } = useSettings();
  const { events, addEvent, isBlocked } = useEvents();
  const { session } = useAuth();
  const isLicensee = session?.role === 'licensee';
  const lockedUnitId = isLicensee ? (session?.unitId || 'sp-centro') : 'sp-centro';
  const [selectedUnit, setSelectedUnit] = useState(
    session?.unitId === 'all' ? 'sp-centro' : lockedUnitId
  );
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [eventCreatedId, setEventCreatedId] = useState<number | null>(null);

  const catalog = buildUnitCatalog(selectedUnit, getUnitEquipments(selectedUnit));
  const availableEquipments = catalog.equipments.filter(eq => eq.type !== 'service');
  const supervisorService = catalog.equipments.find(eq => eq.type === 'service' && eq.name.toLowerCase().includes('monitor'));
  const supervisorPrice = supervisorService ? Number(supervisorService.price) : 150;
  const SUPERVISOR_FLAT_FEE = 150;
  
  const [contractData, setContractData] = useState({
    clientName: '',
    cpf: '',
    clientPhone: '',
    address: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      referencia: '',
    },
    eventDate: '',
    eventTime: '12:00 - 16:00',
    timeSlot: '12-16' as TimeSlotId,
    equipmentId: '',
    equipmentName: '',
    duration: '4h',
    totalValue: '',
    hasSupervisor: false,
    eventType: 'Aniversário' as 'Aniversário' | 'Corporativo' | 'Casamento' | 'Chá Revelação' | 'Festa Escolar' | 'Outros',
    eventDetail: '',
    lat: null as number | null,
    lng: null as number | null,
  });

  const [isTotalValueManuallyEdited, setIsTotalValueManuallyEdited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const templateRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [addressSearch, setAddressSearch] = useState('');

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const hasGoogleMapsKey = googleMapsApiKey.trim().length > 0;
  const { isLoaded: isGoogleLoaded } = useJsApiLoader({
    id: 'new-contract-google-places',
    googleMapsApiKey,
    libraries: googleLibraries,
  });

  const durationMultiplier = useMemo(() => {
    switch (contractData.duration) {
      case '4h':
        return 1;
      case '8h':
        return 2;
      case 'Diária':
        return 3;
      case 'Final de semana':
        return 4;
      default:
        return 1;
    }
  }, [contractData.duration]);

  const selectedEquipment = useMemo(
    () => availableEquipments.find(eq => eq.id === contractData.equipmentId),
    [availableEquipments, contractData.equipmentId]
  );

  useEffect(() => {
    if (!selectedEquipment) return;
    if (isTotalValueManuallyEdited) return;

    const basePrice = Number(selectedEquipment.price) || 0;
    const computed = (basePrice * durationMultiplier) + (contractData.hasSupervisor ? SUPERVISOR_FLAT_FEE : 0);
    setContractData(prev => ({
      ...prev,
      totalValue: computed ? computed.toFixed(2) : ''
    }));
  }, [selectedEquipment, durationMultiplier, contractData.hasSupervisor, isTotalValueManuallyEdited]);

  const onlyDigits = (v: string) => v.replace(/\D/g, '');
  const formatCep = (v: string) => {
    const digits = onlyDigits(v).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const consolidateAddress = (a: typeof contractData.address) => {
    const street = a.logradouro?.trim();
    const num = a.numero?.trim();
    const bairro = a.bairro?.trim();
    const cidade = a.cidade?.trim();
    const uf = a.uf?.trim();
    const cep = a.cep?.trim();
    const comp = a.complemento?.trim();

    const first = [street, num].filter(Boolean).join(', ');
    const firstWithComp = comp ? `${first} - ${comp}` : first;
    const second = [bairro, cidade].filter(Boolean).join(' - ');
    const third = [uf, cep].filter(Boolean).join(', ');

    return [firstWithComp, second, third].filter(Boolean).join(' | ');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'equipmentId') {
      const selectedEq = availableEquipments.find(eq => eq.id === value);
      if (selectedEq) {
        setContractData(prev => {
          return {
            ...prev,
            equipmentId: value,
            equipmentName: selectedEq.name,
          };
        });
        setIsTotalValueManuallyEdited(false);
      } else {
        setContractData(prev => ({ ...prev, equipmentId: '', equipmentName: '' }));
      }
    } else if (name === 'eventType') {
      setContractData(prev => ({ ...prev, eventType: value as any, eventDetail: '' }));
    } else if (name === 'duration') {
      setContractData(prev => ({ ...prev, duration: value }));
      setIsTotalValueManuallyEdited(false);
    } else if (name.startsWith('address.')) {
      const field = name.replace('address.', '') as keyof typeof contractData.address;
      if (field === 'cep') {
        const formatted = formatCep(value);
        setContractData((prev) => ({
          ...prev,
          address: { ...prev.address, cep: formatted },
        }));
      } else if (field === 'uf') {
        setContractData((prev) => ({
          ...prev,
          address: { ...prev.address, uf: value.toUpperCase().slice(0, 2) },
        }));
      } else {
        setContractData((prev) => ({
          ...prev,
          address: { ...prev.address, [field]: value },
        }));
      }
    } else {
      if (name === 'totalValue') {
        setIsTotalValueManuallyEdited(true);
      }
      setContractData({ ...contractData, [name]: value });
    }
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place) return;

    const components = place.address_components || [];
    const readPart = (type: string, short = false) => {
      const found = components.find((component) => component.types.includes(type));
      if (!found) return '';
      return short ? found.short_name : found.long_name;
    };

    const street = readPart('route');
    const number = readPart('street_number');
    const neighborhood = readPart('sublocality_level_1') || readPart('sublocality') || readPart('neighborhood');
    const city = readPart('administrative_area_level_2') || readPart('locality');
    const state = readPart('administrative_area_level_1', true);
    const zipCode = formatCep(readPart('postal_code'));

    const lat = place.geometry?.location?.lat() ?? null;
    const lng = place.geometry?.location?.lng() ?? null;

    setAddressSearch(place.formatted_address || [street, number, neighborhood, city].filter(Boolean).join(' - '));
    setContractData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        logradouro: street || prev.address.logradouro,
        numero: number || prev.address.numero,
        bairro: neighborhood || prev.address.bairro,
        cidade: city || prev.address.cidade,
        uf: state || prev.address.uf,
        cep: zipCode || prev.address.cep,
      },
      lat,
      lng,
    }));
  };

  const handleSupervisorToggle = () => {
    setContractData(prev => ({ ...prev, hasSupervisor: !prev.hasSupervisor }));
    setIsTotalValueManuallyEdited(false);
  };

  const selectedEquipmentPrice = availableEquipments.find(eq => eq.id === contractData.equipmentId)?.price;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  const generatePDF = async () => {
    if (isGeneratingPdf) return;
    if (!contractData.clientName || !contractData.cpf || !contractData.equipmentId) {
      showToast('Preencha Nome, CPF e selecione um Equipamento.');
      return;
    }

    if (!templateRef.current) {
      showToast('Não foi possível gerar o PDF. Tente novamente.');
      return;
    }

    setIsGeneratingPdf(true);

    if (isBlocked({ unitId: selectedUnit, date: new Date(contractData.eventDate), time: contractData.eventTime })) {
      showToast('Conflito de agenda para essa unidade/horário.');
      setIsGeneratingPdf(false);
      return;
    }

    // Add event to Agenda
    const [year, month, day] = contractData.eventDate.split('-');
    const [hours, minutes] = contractData.eventTime.split(':');
    const eventDateObj = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));

    // Calculate end time based on duration
    let endTimeStr = 'TBD';
    if (contractData.duration === '4h') {
      const end = new Date(eventDateObj.getTime() + 4 * 60 * 60 * 1000);
      endTimeStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (contractData.duration === '8h') {
      const end = new Date(eventDateObj.getTime() + 8 * 60 * 60 * 1000);
      endTimeStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      endTimeStr = contractData.duration;
    }

    const finalEquipments = [contractData.equipmentName];
    if (contractData.hasSupervisor && supervisorService) {
      finalEquipments.push(supervisorService.name);
    }

    const consolidatedAddress = consolidateAddress(contractData.address);

    const generatedEventId = getNextEventId(events);
    addEvent({
      id: generatedEventId,
      client: contractData.clientName,
      time: `${contractData.eventTime} - ${endTimeStr}`,
      address: consolidatedAddress,
      phone: contractData.clientPhone,
      lat: contractData.lat,
      lng: contractData.lng,
      status: 'pending',
      financialStatus: 'Pendente',
      totalValue: Number(contractData.totalValue) || 0,
      duration: contractData.duration as any,
      isDelivered: false,
      actualStartTime: null,
      equipments: finalEquipments,
      date: eventDateObj,
      eventType: contractData.eventType,
      eventDetail: contractData.eventDetail,
      unitId: selectedUnit,
      creatorRole: session?.role || 'licensee',
      missionState: 'scheduled',
      timeSlot: contractData.timeSlot,
    });

    try {
      await generateBulletproofPDF(templateRef.current, `Contrato_${contractData.clientName.replace(/\s+/g, '_')}`);
      setEventCreatedId(generatedEventId);
      setShowSuccessScreen(true);
      showToast('✅ Contrato gerado com sucesso!');
    } catch {
      showToast('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
    
  };

  if (showSuccessScreen) {
    const clientWaLink = buildClientWhatsAppLink(contractData.clientPhone, {
      client: contractData.clientName,
      date: `${contractData.eventDate} às ${contractData.eventTime}`,
      unitName: catalog.unitName,
    });
    const licenseeWaLink = buildLicenseeWhatsAppLink(selectedUnit, {
      id: eventCreatedId || 'novo',
      client: contractData.clientName,
    });
    return (
      <div className="p-4 pt-8 max-w-md mx-auto pb-24">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-black text-primary-900">Contrato Gerado</h2>
          <p className="text-slate-500 mt-2">Agora você pode enviar as mensagens corretas para cliente e licenciado.</p>
          <div className="space-y-3 mt-6">
            <a
              href={clientWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-bold py-4 rounded-xl flex items-center justify-center"
            >
              Enviar mensagem ao cliente
            </a>
            <a
              href={licenseeWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center"
            >
              Falar com o licenciado
            </a>
            <button
              type="button"
              onClick={() => navigate('/agenda')}
              className="w-full border border-slate-200 text-slate-700 font-bold py-4 rounded-xl"
            >
              Ir para Agenda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 max-w-md mx-auto pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-bold">
          {toast}
        </div>
      )}

      {/* Hidden A4 template for PDF capture */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <ContractTemplate
          ref={templateRef}
          data={{
            clientName: contractData.clientName,
            cpf: contractData.cpf,
            clientPhone: contractData.clientPhone,
            eventAddress: consolidateAddress(contractData.address),
            eventDate: contractData.eventDate,
            eventTime: contractData.eventTime,
            equipmentName: contractData.equipmentName,
            duration: contractData.duration,
            totalValue: contractData.totalValue,
            hasSupervisor: contractData.hasSupervisor,
          }}
        />
      </div>

      <header className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-primary-900 tracking-tight">Novo Contrato</h1>
          <p className="text-slate-500 font-medium text-sm">Gerar PDF para assinatura</p>
        </div>
      </header>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Unidade</label>
          <select
            value={selectedUnit}
            disabled={isLicensee}
            onChange={(e) => {
              setSelectedUnit(e.target.value);
              setContractData((prev) => ({ ...prev, equipmentId: '', equipmentName: '' }));
            }}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors bg-white disabled:bg-slate-50"
          >
            {UNITS.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          {session?.role === 'commercial' && (
            <p className="text-[10px] text-primary-700 font-bold mt-1">
              Venda direcionada ao CRM/Agenda do licenciado selecionado.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Cliente</label>
          <input 
            type="text" 
            name="clientName"
            value={contractData.clientName}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
            placeholder="Ex: Maria Silva"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">CPF</label>
          <input 
            type="text" 
            name="cpf"
            value={contractData.cpf}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp do Cliente</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="tel" 
              name="clientPhone"
              value={contractData.clientPhone}
              onChange={handleChange}
              className="w-full border-2 border-slate-100 rounded-xl py-3 pl-10 pr-3 focus:border-primary-500 focus:outline-none transition-colors"
              placeholder="Ex: (11) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Endereço do Evento</label>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Buscar Endereço (Google Maps)
              </label>
              {!hasGoogleMapsKey && (
                <div className="mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-2 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                  Configure a chave da API
                </div>
              )}
              {hasGoogleMapsKey && isGoogleLoaded ? (
                <Autocomplete
                  onLoad={(autocomplete) => {
                    autocompleteRef.current = autocomplete;
                  }}
                  onPlaceChanged={handlePlaceChanged}
                  options={{
                    componentRestrictions: { country: 'br' },
                    fields: ['address_components', 'formatted_address', 'geometry'],
                  }}
                >
                  <input
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                    placeholder="Ex: Rua das Flores, 123 - Centro (Festa do Cauã)"
                  />
                </Autocomplete>
              ) : (
                <input
                  type="text"
                  value={addressSearch}
                  onChange={(e) => setAddressSearch(e.target.value)}
                  disabled
                  className="w-full border-2 border-slate-100 rounded-xl p-3 bg-slate-50 text-slate-400"
                  placeholder="Buscar Endereço (Google Maps)"
                />
              )}
            </div>

            {/* Row 2 */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Número</label>
              <input
                type="text"
                name="address.numero"
                value={contractData.address.numero}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="123"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Complemento</label>
              <input
                type="text"
                name="address.complemento"
                value={contractData.address.complemento}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Apto, bloco..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bairro</label>
              <input
                type="text"
                name="address.bairro"
                value={contractData.address.bairro}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Bairro"
              />
            </div>

            {/* Row 3 */}
            <div className="col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cidade</label>
              <input
                type="text"
                name="address.cidade"
                value={contractData.address.cidade}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Cidade"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">UF</label>
              <select
                name="address.uf"
                value={contractData.address.uf}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors bg-white"
              >
                <option value="" disabled>
                  UF
                </option>
                {[
                  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
                ].map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4 */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CEP</label>
              <input
                type="text"
                name="address.cep"
                value={contractData.address.cep}
                onChange={handleChange}
                inputMode="numeric"
                maxLength={9}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="00000-000"
              />
            </div>

            {/* Row 5 */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Logradouro</label>
              <input
                type="text"
                name="address.logradouro"
                value={contractData.address.logradouro}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Rua, Avenida..."
              />
            </div>

            {/* Row 6 */}
            <div className="col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ponto de Referência
              </label>
              <input
                type="text"
                name="address.referencia"
                value={contractData.address.referencia}
                onChange={handleChange}
                className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
                placeholder="Ex: próximo à padaria, portaria 2..."
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
            <input 
              type="date" 
              name="eventDate"
              value={contractData.eventDate}
              onChange={handleChange}
              className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Período (bloco 4h)
            </label>
            <select
              value={contractData.timeSlot}
              onChange={(e) => {
                const slot = e.target.value as TimeSlotId;
                setContractData((prev) => ({
                  ...prev,
                  timeSlot: slot,
                  eventTime: formatRangeFromSlot(slot),
                  duration: '4h',
                }));
              }}
              className="w-full border-2 border-slate-100 rounded-xl p-3 font-medium focus:border-primary-500 focus:outline-none bg-white"
            >
              {TIME_SLOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-amber-700 font-medium mt-1">
              Horários fora do bloco consomem o período inteiro (ex.: 15h–19h bloqueia 12h–16h e
              16h–20h).
            </p>
            {contractData.eventDate &&
              isBlocked({
                unitId: selectedUnit,
                date: new Date(contractData.eventDate),
                time: contractData.eventTime,
              }) && (
                <p className="text-[10px] text-red-600 font-bold mt-1">Conflito neste período/unidade.</p>
              )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Modalidade do Evento</label>
          <select 
            name="eventType"
            value={contractData.eventType}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors bg-white"
          >
            <option value="Aniversário">Aniversário</option>
            <option value="Corporativo">Corporativo</option>
            <option value="Casamento">Casamento</option>
            <option value="Chá Revelação">Chá Revelação</option>
            <option value="Festa Escolar">Festa Escolar</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">
            {contractData.eventType === 'Aniversário' && 'Idade que a criança está completando hoje'}
            {contractData.eventType === 'Corporativo' && 'Nome da Empresa'}
            {contractData.eventType === 'Casamento' && 'Nome dos Noivos ou Promoter'}
            {contractData.eventType === 'Chá Revelação' && 'Nome da Criança ou Família'}
            {contractData.eventType === 'Festa Escolar' && 'Nome da Escola'}
            {contractData.eventType === 'Outros' && 'Detalhes do Evento'}
          </label>
          <input 
            type={contractData.eventType === 'Aniversário' ? 'number' : 'text'} 
            name="eventDetail"
            value={contractData.eventDetail}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
            placeholder={
              contractData.eventType === 'Aniversário' ? 'Ex: 5' :
              contractData.eventType === 'Corporativo' ? 'Ex: Empresa XYZ' :
              contractData.eventType === 'Casamento' ? 'Ex: João e Maria' :
              contractData.eventType === 'Chá Revelação' ? 'Ex: Família Silva' :
              contractData.eventType === 'Festa Escolar' ? 'Ex: Escola ABC' :
              'Detalhes adicionais...'
            }
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Equipamento(s)</label>
          <select 
            name="equipmentId"
            value={contractData.equipmentId}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors bg-white"
          >
            <option value="" disabled>Selecione um equipamento...</option>
            {availableEquipments.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
          {selectedEquipmentPrice && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Preço base sugerido: R$ {Number(selectedEquipmentPrice).toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Duração do Evento</label>
          <select 
            name="duration"
            value={contractData.duration}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors bg-white"
          >
            <option value="4h">4h</option>
            <option value="8h">8h</option>
            <option value="Diária">Diária</option>
            <option value="Final de semana">Final de semana</option>
          </select>
        </div>

        {/* Serviços Adicionais Section */}
        <div className="pt-2 pb-2">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Serviços Adicionais</h3>
          <div 
            className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 cursor-pointer hover:border-primary-100 transition-colors"
            onClick={handleSupervisorToggle}
          >
            <div>
              <p className="text-sm font-bold text-slate-700">Incluir Supervisor/Monitor no Evento</p>
              <p className="text-xs font-medium text-emerald-600 mt-0.5">+ R$ {supervisorPrice.toFixed(2)}</p>
            </div>
            <div 
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                contractData.hasSupervisor ? "bg-emerald-500" : "bg-slate-200"
              )}
            >
              <div 
                className={clsx(
                  "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                  contractData.hasSupervisor ? "translate-x-6" : "translate-x-0"
                )}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Valor Total (R$)</label>
          <input 
            type="number" 
            name="totalValue"
            value={contractData.totalValue}
            onChange={handleChange}
            className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary-500 focus:outline-none transition-colors"
            placeholder="0.00"
          />
        </div>

        <button 
          onClick={generatePDF}
          disabled={
            !contractData.clientName ||
            !contractData.cpf ||
            !contractData.equipmentId ||
            !contractData.eventDate ||
            !contractData.clientPhone ||
            !contractData.address.cep ||
            !contractData.address.logradouro ||
            !contractData.address.numero ||
            !contractData.address.cidade ||
            !contractData.address.uf ||
            isGeneratingPdf
          }
          className="w-full mt-6 bg-primary-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-5 h-5" />
          {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar Contrato PDF'}
        </button>
      </div>
    </div>
  );
}
