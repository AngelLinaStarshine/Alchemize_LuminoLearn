import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    m.addEventListener('change', onChange);
    setMatches(m.matches);
    return () => m.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** lg breakpoint — matches Tailwind lg (1024px) */
export function useIsDesktopLg() {
  return useMediaQuery('(min-width: 1024px)');
}

/** Phone / small tablet layout (matches Tailwind md upper bound) */
export function useIsMobileLayout() {
  return useMediaQuery('(max-width: 767px)');
}

/** Primary input is touch (phones, tablets held as touch-first) */
export function usePrefersCoarsePointer() {
  return useMediaQuery('(pointer: coarse)');
}
