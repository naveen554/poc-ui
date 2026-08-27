import { useEffect } from 'react';
import { XIcon } from 'lucide-react';

interface PGHistoryProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function PGHistory({ open, onClose, title, children, width = 'w-[600px]' }: PGHistoryProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className={`relative ml-auto ${width} flex max-h-screen flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-2.5">
          <h2 className="text-lg font-semibold text-navy-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close drawer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
