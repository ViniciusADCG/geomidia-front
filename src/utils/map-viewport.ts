import type L from 'leaflet';

import type { MapViewport } from '../types';

export function readMapViewport(map: Pick<L.Map, 'getBounds' | 'getZoom'>): MapViewport | null {
  const bounds = map.getBounds();
  if (!bounds.isValid()) return null;
  const { lat: north, lng: east } = bounds.getNorthEast();
  const { lat: south, lng: west } = bounds.getSouthWest();
  if (north <= south || east <= west) return null;
  return { north, south, east, west, zoom: map.getZoom() };
}

export function createViewportScheduler(load: () => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        load();
      }, delay);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      load();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export function clusterZoom(currentZoom: number): number {
  return Math.min(currentZoom + 2, 19);
}
