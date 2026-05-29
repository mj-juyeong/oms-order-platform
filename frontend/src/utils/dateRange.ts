export type DateRangePreset = 'ALL' | 'TODAY' | 'TOMORROW' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

export interface DateRangeValue {
  preset: DateRangePreset;
  from: string;
  to: string;
}

const presetLabels: Record<DateRangePreset, string> = {
  ALL: '전체',
  TODAY: '오늘',
  TOMORROW: '내일',
  LAST_7_DAYS: '최근 7일',
  LAST_30_DAYS: '최근 30일',
  THIS_MONTH: '이번 달',
  CUSTOM: '직접 선택',
};

export function dateRangeForPreset(preset: DateRangePreset): Pick<DateRangeValue, 'from' | 'to'> {
  const today = startOfDay(new Date());

  if (preset === 'ALL') {
    return { from: '', to: '' };
  }

  if (preset === 'TODAY') {
    const date = formatDate(today);
    return { from: date, to: date };
  }

  if (preset === 'TOMORROW') {
    const date = formatDate(addDays(today, 1));
    return { from: date, to: date };
  }

  if (preset === 'LAST_7_DAYS') {
    return { from: formatDate(addDays(today, -6)), to: formatDate(today) };
  }

  if (preset === 'LAST_30_DAYS') {
    return { from: formatDate(addDays(today, -29)), to: formatDate(today) };
  }

  if (preset === 'THIS_MONTH') {
    return { from: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: formatDate(today) };
  }

  return { from: '', to: '' };
}

export function formatDateRangeFilterLabel(value: DateRangeValue, basisLabel: string) {
  if (value.preset === 'ALL') {
    return null;
  }

  if (value.preset !== 'CUSTOM') {
    return `${basisLabel} ${presetLabels[value.preset]}`;
  }

  return `${basisLabel} ${value.from || '시작일 없음'} ~ ${value.to || '종료일 없음'}`;
}

export function isDateInRange(value: string | null | undefined, range: DateRangeValue) {
  if (range.preset === 'ALL' || (!range.from && !range.to)) {
    return true;
  }

  const date = value?.slice(0, 10) ?? '';

  if (!date) {
    return false;
  }

  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

export function todayString() {
  return formatDate(new Date());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
