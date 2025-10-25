export function ProfileLoading() {
  return (
    <div className="flex items-center space-x-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-earth-700" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-earth-700 rounded" />
        <div className="h-3 w-16 bg-earth-700 rounded" />
      </div>
    </div>
  );
}