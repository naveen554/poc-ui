import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ open, title, onClose, children, width = 'w-[380px]' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} />
        
          <motion.aside
          className={`relative flex h-full ${width} flex-col border-l border-gray-200 bg-white shadow-xl`}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
          
            <header className="flex h-11 shrink-0 items-center bg-navy-700 px-3 text-white">
              <h2 className="text-[13px] font-semibold">{title}</h2>
              <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded p-1 transition-colors duration-150 ease-out hover:bg-white/15"
              aria-label="Close validation results">
              
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      }
    </AnimatePresence>);

}