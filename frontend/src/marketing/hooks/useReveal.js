import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Observe .pa-reveal elements and add .is-visible when they enter the viewport.
 * Re-runs on route change. Respects prefers-reduced-motion.
 */
export function useReveal(rootRef) {
  const location = useLocation();

  useEffect(() => {
    let observer;
    let cancelled = false;

    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const root = rootRef?.current;
      if (!root) return;

      const nodes = Array.from(root.querySelectorAll('.pa-reveal:not(.is-visible)'));
      if (!nodes.length) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nodes.forEach((el) => el.classList.add('is-visible'));
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      nodes.forEach((el) => observer.observe(el));
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
      if (observer) observer.disconnect();
    };
  }, [rootRef, location.pathname]);
}

export default useReveal;
