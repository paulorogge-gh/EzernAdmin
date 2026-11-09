import { useLayoutEffect, useRef, useState } from 'react';

const DURATION_MS = 520;

/**
 * Expande/recolhe filhos com altura animada (modal cresce junto) + fade/slide.
 * `contentKey` remensura a altura quando o bloco interno muda (ex.: PF ↔ PJ).
 */
export function FormReveal({ open, children, contentKey, className = '' }) {
  const shellRef = useRef(null);
  const contentRef = useRef(null);
  const skipEnterAnim = useRef(open);
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  /** `null` = height: auto */
  const [heightPx, setHeightPx] = useState(open ? null : 0);

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;

    const content = contentRef.current;
    if (!content) return undefined;

    if (open) {
      if (skipEnterAnim.current) {
        skipEnterAnim.current = false;
        setExpanded(true);
        setHeightPx(null);
        return undefined;
      }

      setExpanded(false);
      setHeightPx(0);
      const target = content.scrollHeight;
      const raf = requestAnimationFrame(() => {
        setHeightPx(target);
        setExpanded(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    skipEnterAnim.current = false;
    const current = content.scrollHeight;
    setHeightPx(current);
    setExpanded(false);
    const raf = requestAnimationFrame(() => {
      setHeightPx(0);
    });
    const timer = window.setTimeout(() => {
      setMounted(false);
      setHeightPx(0);
    }, DURATION_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [open, mounted]);

  useLayoutEffect(() => {
    if (!open || !expanded || !mounted) return undefined;
    if (contentKey === undefined) return undefined;

    const content = contentRef.current;
    const shell = shellRef.current;
    if (!content || !shell) return undefined;

    const next = content.scrollHeight;
    const prev = shell.getBoundingClientRect().height;
    if (Math.abs(prev - next) < 2) return undefined;

    setHeightPx(prev);
    const raf = requestAnimationFrame(() => {
      setHeightPx(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [contentKey, open, expanded, mounted]);

  const onTransitionEnd = (event) => {
    if (event.target !== shellRef.current) return;
    if (event.propertyName !== 'height') return;
    if (open && expanded) setHeightPx(null);
  };

  if (!mounted) return null;

  return (
    <div
      ref={shellRef}
      className={`form-reveal ${expanded ? 'is-open' : ''} ${className}`.trim()}
      style={{ height: heightPx === null ? 'auto' : `${heightPx}px` }}
      onTransitionEnd={onTransitionEnd}
      aria-hidden={!open}
    >
      <div ref={contentRef} className="form-reveal__inner">
        <div className="form-reveal__content stack-tight">{children}</div>
      </div>
    </div>
  );
}
