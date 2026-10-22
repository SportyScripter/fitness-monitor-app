import { useState, useEffect } from 'react';

export type ScrollDirection = 'up' | 'down';

export interface UseScrollDirectionOptions {
  threshold?: number;
  initialDirection?: ScrollDirection;
  topOffset?: number;
}

/**
 * Custom hook wykrywający kierunek scrollowania ('up' | 'down').
 * Posiada próg czułości (threshold, domyślnie 10px), który zapobiega
 * migotaniu interfejsu przy delikatnych przesunięciach palca lub drganiach.
 * W pobliżu samej góry ekranu (< topOffset) zawsze zwraca 'up', aby nagłówek
 * i pełny pasek były natychmiast widoczne po powrocie na start strony.
 */
export function useScrollDirection({
  threshold = 10,
  initialDirection = 'up',
  topOffset = 20,
}: UseScrollDirectionOptions = {}): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(initialDirection);

  useEffect(() => {
    let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Na samej górze strony zawsze wymuś kierunek 'up'
      if (scrollY <= topOffset) {
        setScrollDirection('up');
        lastScrollY = scrollY > 0 ? scrollY : 0;
        ticking = false;
        return;
      }

      // Sprawdzenie czy użytkownik znajduje się na samym dole dokumentu
      // Blokuje zmianę stanu paska przy elastycznym odbiciu (bounce / overscroll) na iOS
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.offsetHeight || 0
      );
      const isAtBottom = window.innerHeight + scrollY >= scrollHeight - 15;
      if (isAtBottom) {
        ticking = false;
        return;
      }

      const diff = scrollY - lastScrollY;

      // Zastosuj minimalny próg czułości w pikselach
      if (Math.abs(diff) >= threshold) {
        const newDirection: ScrollDirection = diff > 0 ? 'down' : 'up';
        setScrollDirection((prev) => (prev !== newDirection ? newDirection : prev));
        lastScrollY = scrollY > 0 ? scrollY : 0;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, topOffset]);

  return scrollDirection;
}
