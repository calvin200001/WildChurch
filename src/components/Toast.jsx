import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-400" />
  };

  const bgColors = {
    success: 'bg-green-900/90 border-green-700',
    error: 'bg-red-900/90 border-red-700',
    info: 'bg-blue-900/90 border-blue-700'
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColors[type]} border rounded-lg shadow-2xl p-4 max-w-md animate-slide-up`}>
      <div className="flex items-center space-x-3">
        {icons[type]}
        <p className="text-earth-100 flex-1">{message}</p>
        <button onClick={onClose} className="text-earth-400 hover:text-earth-200">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}