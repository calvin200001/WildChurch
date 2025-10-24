import { MapPin, Compass } from 'lucide-react';

export function MapEmptyState() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <div className="bg-earth-800/95 backdrop-blur-sm border border-earth-700 rounded-2xl shadow-2xl p-8 max-w-md mx-4 pointer-events-auto">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-forest-800 p-4 rounded-full">
              <MapPin className="h-12 w-12 text-forest-400" />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-earth-50 mb-3">
            Welcome to WildChurch
          </h3>
          <p className="text-earth-300 mb-6 leading-relaxed">
            Click anywhere on the map to drop a pin and create a gathering, mark a camp, or share a quiet place.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-earth-400">
            <Compass className="h-4 w-4" />
            <span>Explore the wilderness together</span>
          </div>
        </div>
      </div>
    </div>
  );
}