/** Seletor de hora cheia em português (00h–23h). */
export const FULL_HOURS = Array.from({ length: 24 }, (_, i) => i);

export function formatHourPt(hour: number): string {
  return `${hour.toString().padStart(2, '0')}h`;
}

export function hourToTimeString(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

type Props = {
  label: string;
  valueHour: number;
  onChange: (hour: number) => void;
  className?: string;
  disabled?: boolean;
};

export default function HourSelect({ label, valueHour, onChange, className, disabled }: Props) {
  return (
    <div className={className}>
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <select
        value={valueHour}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1 border-2 rounded-xl p-3 min-h-[48px] font-bold bg-white disabled:bg-slate-50"
      >
        {FULL_HOURS.map((h) => (
          <option key={h} value={h}>
            {formatHourPt(h)}
          </option>
        ))}
      </select>
    </div>
  );
}
