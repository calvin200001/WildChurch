const maptilerKey = import.meta.env.VITE_MAPTILER_API_KEY;

export const MAP_CONFIG = {
  style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`,
  center: [-105, 40], // Colorado default
  zoom: 6,
  minZoom: 3,
  maxZoom: 18
};
