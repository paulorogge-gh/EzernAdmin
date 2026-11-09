import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from '../components/ui/Alert';

const NotifyContext = createContext(null);

export function NotifyProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 220);
  }, []);

  const notify = useCallback(
    (message, variant = 'info', options = {}) => {
      const id = crypto.randomUUID();
      const duration = options.duration ?? 4200;
      setItems((prev) => [
        ...prev,
        {
          id,
          message,
          variant,
          title: options.title,
          leaving: false,
        },
      ]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite">
        {items.map((item) => (
          <Alert
            key={item.id}
            variant={item.variant}
            title={item.title}
            message={item.message}
            leaving={item.leaving}
            onClose={() => dismiss(item.id)}
          />
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify fora do NotifyProvider');
  return ctx;
}
