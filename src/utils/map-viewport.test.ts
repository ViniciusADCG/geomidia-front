import { afterEach, describe, expect, it, vi } from 'vitest';

import type L from 'leaflet';

import { clusterZoom, createViewportScheduler, readMapViewport } from './map-viewport';

afterEach(() => vi.useRealTimers());

describe('interação com viewport do Leaflet', () => {
  it('lê os bounds atuais do mapa somente quando válidos', () => {
    const bounds = {
      isValid: () => true,
      getNorthEast: () => ({ lat: -20.45, lng: -54.60 }),
      getSouthWest: () => ({ lat: -20.47, lng: -54.62 }),
    };
    const map = { getBounds: () => bounds, getZoom: () => 12 } as unknown as L.Map;
    expect(readMapViewport(map)).toEqual({
      north: -20.45, south: -20.47, east: -54.60, west: -54.62, zoom: 12,
    });
    bounds.isValid = () => false;
    expect(readMapViewport(map)).toBeNull();
  });
  it('agrupa moveend e zoomend rápidos em uma consulta após 300 ms', async () => {
    vi.useFakeTimers();
    const load = vi.fn();
    const scheduler = createViewportScheduler(load);
    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(200);
    scheduler.schedule();
    await vi.advanceTimersByTimeAsync(299);
    expect(load).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('refresh imediato descarta o debounce pendente e saída da tela cancela consulta', async () => {
    vi.useFakeTimers();
    const load = vi.fn();
    const scheduler = createViewportScheduler(load);
    scheduler.schedule();
    scheduler.flush();
    await vi.advanceTimersByTimeAsync(300);
    expect(load).toHaveBeenCalledTimes(1);
    scheduler.schedule();
    scheduler.cancel();
    await vi.advanceTimersByTimeAsync(300);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('clique em cluster aproxima o zoom de forma limitada', () => {
    expect(clusterZoom(10)).toBe(12);
    expect(clusterZoom(18)).toBe(19);
  });
});
