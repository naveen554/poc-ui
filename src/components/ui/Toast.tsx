import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XIcon } from 'lucide-react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 min-w-[320px] max-w-[500px] ${
        type === 'success' 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        {type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <p className={`text-sm flex-1 ${
          type === 'success' ? 'text-green-800' : 'text-red-800'
        }`}>
          {message}
        </p>
        <button
          onClick={onClose}
          className={`p-0.5 rounded hover:bg-opacity-20 transition-colors ${
            type === 'success' 
              ? 'text-green-600 hover:bg-green-600' 
              : 'text-red-600 hover:bg-red-600'
          }`}
          aria-label="Close notification"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
