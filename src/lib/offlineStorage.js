import localforage from 'localforage';

const offlineStore = localforage.createInstance({
  name: 'wildchurch-offline'
});

export const offlineStorage = {
  // Save pins for offline viewing
  async savePins(pins) {
    await offlineStore.setItem('cached-pins', {
      data: pins,
      timestamp: Date.now()
    });
  },

  async getCachedPins() {
    const cached = await offlineStore.getItem('cached-pins');
    if (!cached) return null;
    
    // Return if less than 1 hour old
    if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
      return cached.data;
    }
    return null;
  },

  // Queue actions when offline
  async queueAction(action) {
    const queue = await offlineStore.getItem('action-queue') || [];
    queue.push({
      ...action,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    });
    await offlineStore.setItem('action-queue', queue);
  },

  async getActionQueue() {
    return await offlineStore.getItem('action-queue') || [];
  },

  async clearActionQueue() {
    await offlineStore.removeItem('action-queue');
  },

  // Cache map region
  async cacheMapRegion(bounds, zoom) {
    const regionKey = `map-region-${bounds.join('-')}-z${zoom}`;
    await offlineStore.setItem(regionKey, {
      bounds,
      zoom,
      timestamp: Date.now()
    });
  }
};
