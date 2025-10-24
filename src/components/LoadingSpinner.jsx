export function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`animate-spin rounded-full border-b-2 border-forest-500 ${sizeClasses[size]}`}></div>
      <p className="text-earth-400 mt-4">Loading...</p>
    </div>
  );
}