import { Input } from './Input';
import type { InputHTMLAttributes } from 'react';

export function DateInput(props: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <Input type="date" {...props} />;
}
