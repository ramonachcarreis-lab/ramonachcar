import { useId } from 'react';
import { clsx } from 'clsx';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export default function AppSwitch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
  className,
}: Props) {
  const autoId = useId();
  const switchId = id || autoId;

  return (
    <div
      className={clsx(
        'app-switch-row',
        disabled && 'app-switch-row--disabled',
        className
      )}
    >
      <div className="app-switch-copy min-w-0 flex-1">
        <span className="app-switch-label" id={`${switchId}-label`}>
          {label}
        </span>
        {description ? <span className="app-switch-desc">{description}</span> : null}
        <span
          className={clsx('app-switch-status', checked && 'app-switch-status--on')}
          aria-live="polite"
        >
          {checked ? 'Ligado' : 'Desligado'}
        </span>
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${switchId}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx('app-switch', checked && 'app-switch--on')}
      >
        <span className="app-switch-thumb" aria-hidden />
      </button>
    </div>
  );
}
