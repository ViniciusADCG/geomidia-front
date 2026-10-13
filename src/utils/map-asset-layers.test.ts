import type L from 'leaflet';
import { describe, expect, it, vi } from 'vitest';

import type { MapAssetSummary, MapCluster } from '../types';
import { createMapAssetLayerRenderer } from './map-asset-layers';

function asset(id: string, changes: Partial<MapAssetSummary> = {}): MapAssetSummary {
  return {
    id, latitude: -20.46, longitude: -54.61, radius_meters: 80,
    media_type: 'outdoor', status: 'aprovado', process_code: `PROC-${id}`,
    official_process_code: null, company_responsible: null, contact_name: null,
    ...changes,
  };
}

function fixture() {
  const layers = new Set<unknown>();
  const group = {
    addLayer: vi.fn((path: unknown) => { layers.add(path); }),
    removeLayer: vi.fn((path: unknown) => { layers.delete(path); }),
    clearLayers: vi.fn(() => { layers.clear(); }),
  };
  function path() {
    const handlers = new Map<string, (event: L.LeafletMouseEvent) => void>();
    const result = {
      handlers,
      on: vi.fn((name: string, handler: (event: L.LeafletMouseEvent) => void) => {
        handlers.set(name, handler);
        return result;
      }),
      bindTooltip: vi.fn(() => result),
      addTo: vi.fn(() => { group.addLayer(result); return result; }),
      bringToBack: vi.fn(() => result),
      bringToFront: vi.fn(() => result),
      setLatLng: vi.fn(() => result),
      setRadius: vi.fn(() => result),
      setStyle: vi.fn(() => result),
      setTooltipContent: vi.fn(() => result),
    };
    return result;
  }
  const circles: ReturnType<typeof path>[] = [];
  const markers: ReturnType<typeof path>[] = [];
  const clusters: ReturnType<typeof path>[] = [];
  const leaflet = {
    circle: vi.fn(() => { const item = path(); circles.push(item); return item; }),
    circleMarker: vi.fn(() => { const item = path(); markers.push(item); return item; }),
    marker: vi.fn(() => { const item = path(); clusters.push(item); return item; }),
    divIcon: vi.fn((options: { html: string }) => options),
  };
  const onAssetClick = vi.fn();
  const onClusterClick = vi.fn();
  const renderer = createMapAssetLayerRenderer({
    leaflet: leaflet as unknown as typeof L,
    layer: group as unknown as L.LayerGroup,
    onAssetClick,
    onClusterClick,
  });
  return { renderer, group, layers, leaflet, circles, markers, clusters, onAssetClick, onClusterClick };
}

describe('layers incrementais dos veículos no Mapa', () => {
  it('reutiliza círculo e marcador quando os mesmos ativos chegam novamente', () => {
    const view = fixture();
    view.renderer.render([asset('a'), asset('b')], [], false, null);
    view.renderer.render([asset('a'), asset('b')], [], false, null);
    expect(view.leaflet.circle).toHaveBeenCalledTimes(2);
    expect(view.leaflet.circleMarker).toHaveBeenCalledTimes(2);
    expect(view.group.clearLayers).not.toHaveBeenCalled();
    expect(view.group.removeLayer).not.toHaveBeenCalled();
    expect(view.circles[0].setStyle).not.toHaveBeenCalled();
    expect(view.markers[0].setLatLng).not.toHaveBeenCalled();
  });

  it('adiciona apenas o ativo novo e remove apenas o que saiu da resposta', () => {
    const view = fixture();
    view.renderer.render([asset('a'), asset('b')], [], false, null);
    view.renderer.render([asset('b'), asset('c')], [], false, null);
    expect(view.leaflet.circle).toHaveBeenCalledTimes(3);
    expect(view.leaflet.circleMarker).toHaveBeenCalledTimes(3);
    expect(view.group.removeLayer).toHaveBeenCalledTimes(2);
    expect(view.group.removeLayer).toHaveBeenCalledWith(view.circles[0]);
    expect(view.group.removeLayer).toHaveBeenCalledWith(view.markers[0]);
    expect(view.layers.has(view.circles[1])).toBe(true);
    expect(view.group.clearLayers).not.toHaveBeenCalled();
  });

  it('atualiza posição, raio, tipo, status e protocolo somente no ativo alterado', () => {
    const view = fixture();
    view.renderer.render([asset('a'), asset('b')], [], false, null);
    view.renderer.render([asset('a', {
      latitude: -20.47, longitude: -54.62, radius_meters: 250,
      media_type: 'front light', status: 'irregular', official_process_code: 'OFICIAL-1',
    }), asset('b')], [], false, null);
    expect(view.circles[0].setLatLng).toHaveBeenCalledWith([-20.47, -54.62]);
    expect(view.markers[0].setLatLng).toHaveBeenCalledWith([-20.47, -54.62]);
    expect(view.circles[0].setRadius).toHaveBeenCalledWith(250);
    expect(view.circles[0].setStyle).toHaveBeenCalledTimes(1);
    expect(view.markers[0].setTooltipContent).toHaveBeenCalledWith(expect.stringContaining('OFICIAL-1'));
    expect(view.circles[1].setLatLng).not.toHaveBeenCalled();
    expect(view.circles[1].setRadius).not.toHaveBeenCalled();
    expect(view.markers[1].setStyle).not.toHaveBeenCalled();
    expect(view.leaflet.circle).toHaveBeenCalledTimes(2);
  });

  it('muda somente coordenadas quando a posição muda', () => {
    const view = fixture();
    view.renderer.render([asset('a')], [], false, null);
    view.renderer.render([asset('a', { latitude: -20.48 })], [], false, null);
    expect(view.circles[0].setLatLng).toHaveBeenCalledWith([-20.48, -54.61]);
    expect(view.markers[0].setLatLng).toHaveBeenCalledWith([-20.48, -54.61]);
    expect(view.circles[0].setRadius).not.toHaveBeenCalled();
    expect(view.circles[0].setStyle).not.toHaveBeenCalled();
  });

  it('muda somente o círculo territorial quando o raio muda', () => {
    const view = fixture();
    view.renderer.render([asset('a')], [], false, null);
    view.renderer.render([asset('a', { radius_meters: 1000 })], [], false, null);
    expect(view.circles[0].setRadius).toHaveBeenCalledWith(1000);
    expect(view.circles[0].setLatLng).not.toHaveBeenCalled();
    expect(view.markers[0].setLatLng).not.toHaveBeenCalled();
    expect(view.markers[0].setStyle).not.toHaveBeenCalled();
  });

  it('altera somente os estilos da seleção e mantém os handlers de clique', () => {
    const view = fixture();
    view.renderer.render([asset('a'), asset('b')], [], false, null);
    const event = { originalEvent: { stopPropagation: vi.fn() } } as unknown as L.LeafletMouseEvent;
    view.markers[0].handlers.get('click')?.(event);
    expect(view.onAssetClick).toHaveBeenCalledWith('a', event);
    view.renderer.render([asset('a'), asset('b')], [], false, 'a');
    expect(view.circles[0].setStyle).toHaveBeenCalledWith(expect.objectContaining({ color: '#b42318', radius: 80 }));
    expect(view.markers[0].setStyle).toHaveBeenCalledWith(expect.objectContaining({ radius: 9 }));
    expect(view.circles[1].setStyle).not.toHaveBeenCalled();
    view.renderer.render([asset('a'), asset('b')], [], false, 'b');
    expect(view.markers[0].setStyle).toHaveBeenLastCalledWith(expect.objectContaining({ radius: 7 }));
    expect(view.markers[1].setStyle).toHaveBeenCalledWith(expect.objectContaining({ radius: 9 }));
    expect(view.leaflet.circle).toHaveBeenCalledTimes(2);
  });

  it('reconstrói clusters somente quando a coleção muda e volta aos veículos individuais', () => {
    const view = fixture();
    const clusters: MapCluster[] = [{ id: 'cell-1', count: 5237, latitude: -20.46, longitude: -54.61 }];
    view.renderer.render([asset('a')], [], false, null);
    view.renderer.render([], clusters, true, null);
    expect(view.group.clearLayers).toHaveBeenCalledTimes(1);
    expect(view.leaflet.divIcon).toHaveBeenCalledWith(expect.objectContaining({ html: '<span>5237</span>' }));
    const event = { originalEvent: { stopPropagation: vi.fn() } } as unknown as L.LeafletMouseEvent;
    view.clusters[0].handlers.get('click')?.(event);
    expect(view.onClusterClick).toHaveBeenCalledWith(clusters[0], event);
    view.renderer.render([], clusters, true, 'a');
    expect(view.leaflet.marker).toHaveBeenCalledTimes(1);
    view.renderer.render([asset('b')], [], false, null);
    expect(view.group.clearLayers).toHaveBeenCalledTimes(2);
    expect(view.leaflet.circle).toHaveBeenCalledTimes(2);
    expect(view.layers.has(view.circles[1])).toBe(true);
  });
});
