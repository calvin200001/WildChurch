import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

export function MapSearch({ onSearch, onFilter }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    types: ['open_camp', 'gathering', 'quiet_place', 'resource'],
    tags: [],
    radius: 50
  });

  return (
    <div className="absolute top-20 left-4 right-4 md:left-auto md:w-96 z-10">
      <div className="bg-earth-800 border border-earth-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Bar */}
        <div className="flex items-center p-3 border-b border-earth-700">
          <Search className="h-5 w-5 text-earth-400 mr-2" />
          <input
            type="text"
            placeholder="Search pins, tags, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-earth-100 placeholder-earth-500 outline-none text-sm"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-2 hover:bg-earth-700 rounded-lg transition-colors"
          >
            <Filter className="h-5 w-5 text-earth-400" />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-earth-200 mb-2 block">
                Pin Types
              </label>
              <div className="space-y-2">
                {[
                  { value: 'open_camp', label: '🏕️ Open Camps', emoji: '🏕️' },
                  { value: 'gathering', label: '🙏 Gatherings', emoji: '🙏' },
                  { value: 'quiet_place', label: '🌲 Quiet Places', emoji: '🌲' },
                  { value: 'resource', label: '📍 Resources', emoji: '📍' }
                ].map(type => (
                  <label key={type.value} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({...filters, types: [...filters.types, type.value]});
                        } else {
                          setFilters({...filters, types: filters.types.filter(t => t !== type.value)});
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-forest-600 border-earth-600 bg-earth-700 rounded"
                    />
                    <span className="ml-2 text-earth-200 text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-earth-200 mb-2 block">
                Radius: {filters.radius} miles
              </label>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={filters.radius}
                onChange={(e) => setFilters({...filters, radius: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <button
              onClick={() => onFilter(filters)}
              className="btn-primary w-full text-sm"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}