import { Select } from '../common';
import type { MasterVersion } from '../../types/master';

interface MasterVersionSelectorProps {
  label: string;
  versions: MasterVersion[];
}

export function MasterVersionSelector({ label, versions }: MasterVersionSelectorProps) {
  return (
    <Select
      label={label}
      options={versions.map((version) => ({
        label: `${version.versionName}${version.active ? ' (활성)' : ''}`,
        value: version.id,
      }))}
    />
  );
}
