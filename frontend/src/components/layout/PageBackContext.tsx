import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface PageBackOverride {
  label?: string;
  onBack: () => void;
  visible?: boolean;
}

interface PageBackContextValue {
  override: PageBackOverride | null;
  setOverride: (override: PageBackOverride | null) => void;
}

const PageBackContext = createContext<PageBackContextValue | null>(null);

export function PageBackProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageBackOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);

  return <PageBackContext.Provider value={value}>{children}</PageBackContext.Provider>;
}

export function usePageBackOverride() {
  const context = useContext(PageBackContext);

  if (!context) {
    throw new Error('usePageBackOverride must be used within PageBackProvider');
  }

  return context.override;
}

export function usePageBackButton(override: PageBackOverride | null) {
  const context = useContext(PageBackContext);
  const setOverride = context?.setOverride;

  useEffect(() => {
    if (!setOverride) {
      return;
    }

    setOverride(override);

    return () => {
      setOverride(null);
    };
  }, [override, setOverride]);
}
