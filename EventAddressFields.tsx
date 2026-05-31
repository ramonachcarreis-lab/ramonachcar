import { MapPin } from 'lucide-react';
import type { EventAddress } from '../types/eventAddress';

type Props = {
  value: EventAddress;
  onChange: (next: EventAddress) => void;
  disabled?: boolean;
};

const onlyDigits = (v: string) => v.replace(/\D/g, '');
const formatCep = (v: string) => {
  const digits = onlyDigits(v).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export default function EventAddressFields({ value, onChange, disabled }: Props) {
  const set = (field: keyof EventAddress, v: string) => {
    onChange({ ...value, [field]: v });
  };

  const fetchViaCep = async (cepDigits: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const json = await res.json();
      if (json?.erro) return;
      onChange({
        ...value,
        logradouro: json.logradouro || value.logradouro,
        bairro: json.bairro || value.bairro,
        cidade: json.localidade || value.cidade,
        uf: json.uf || value.uf,
      });
    } catch {
      // silent
    }
  };

  return (
    <section className="space-y-3">
      <p className="text-xs font-black text-slate-700 uppercase flex items-center gap-1">
        <MapPin className="w-3.5 h-3.5" />
        Endereço do serviço *
      </p>

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">CEP</label>
          <input
            disabled={disabled}
            value={value.cep}
            onChange={(e) => set('cep', formatCep(e.target.value))}
            onBlur={() => {
              const d = onlyDigits(value.cep);
              if (d.length === 8) fetchViaCep(d);
            }}
            placeholder="00000-000"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Rua / Avenida</label>
          <input
            disabled={disabled}
            value={value.logradouro}
            onChange={(e) => set('logradouro', e.target.value)}
            placeholder="Logradouro"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº</label>
          <input
            disabled={disabled}
            value={value.numero}
            onChange={(e) => set('numero', e.target.value)}
            placeholder="100"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Bairro</label>
          <input
            disabled={disabled}
            value={value.bairro}
            onChange={(e) => set('bairro', e.target.value)}
            placeholder="Bairro"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
        <div className="col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Cidade</label>
          <input
            disabled={disabled}
            value={value.cidade}
            onChange={(e) => set('cidade', e.target.value)}
            placeholder="Cidade"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">UF</label>
          <select
            disabled={disabled}
            value={value.uf}
            onChange={(e) => set('uf', e.target.value.toUpperCase().slice(0, 2))}
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] bg-white disabled:bg-slate-50"
          >
            <option value="">UF</option>
            {[
              'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB',
              'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
            ].map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Ponto de referência</label>
          <input
            disabled={disabled}
            value={value.referencia}
            onChange={(e) => set('referencia', e.target.value)}
            placeholder="Ex: portão azul, salão no fundo"
            className="w-full mt-0.5 border rounded-lg p-2.5 text-sm min-h-[44px] disabled:bg-slate-50"
          />
        </div>
      </div>
    </section>
  );
}
