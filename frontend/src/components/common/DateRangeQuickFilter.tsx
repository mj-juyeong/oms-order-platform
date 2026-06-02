import { DateInput } from './DateInput';
import { Select } from './Select';
import { dateRangeForPreset, todayString, type DateRangePreset, type DateRangeValue } from '../../utils/dateRange';

interface DateRangeQuickFilterProps {
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  includeTomorrow?: boolean;
}

const basePresetOptions: Array<{ label: string; value: DateRangePreset }> = [
  { label: '전체', value: 'ALL' },
  { label: '오늘', value: 'TODAY' },
  { label: '내일', value: 'TOMORROW' },
  { label: '최근 7일', value: 'LAST_7_DAYS' },
  { label: '최근 30일', value: 'LAST_30_DAYS' },
  { label: '이번 달', value: 'THIS_MONTH' },
  { label: '직접 선택', value: 'CUSTOM' },
];

export function DateRangeQuickFilter({ includeTomorrow = false, label, onChange, value }: DateRangeQuickFilterProps) {
  const presetOptions = includeTomorrow ? basePresetOptions : basePresetOptions.filter((option) => option.value !== 'TOMORROW');

  function handlePresetChange(preset: DateRangePreset) {
    if (preset === 'CUSTOM') {
      onChange({
        preset,
        from: value.from || todayString(),
        to: value.to || value.from || todayString(),
      });
      return;
    }

    onChange({ preset, ...dateRangeForPreset(preset) });
  }

  return (
    <div className="min-w-0">
      <Select
        label={label}
        onChange={(event) => handlePresetChange(event.target.value as DateRangePreset)}
        options={presetOptions}
        value={value.preset}
      />
      {value.preset === 'CUSTOM' ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <DateInput
            aria-label={`${label} 시작일`}
            label="시작일"
            onChange={(event) => onChange({ ...value, from: event.target.value, preset: 'CUSTOM' })}
            value={value.from}
          />
          <DateInput
            aria-label={`${label} 종료일`}
            label="종료일"
            onChange={(event) => onChange({ ...value, to: event.target.value, preset: 'CUSTOM' })}
            value={value.to}
          />
        </div>
      ) : null}
    </div>
  );
}
