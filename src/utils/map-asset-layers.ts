import type L from 'leaflet';

import { mediaTypeColor, mediaTypeLabel } from '../domain/rules';
import type { MapAssetSummary, MapCluster } from '../types';

type VisualAsset = Pick<MapAssetSummary,
  'latitude' | 'longitude' | 'radius_meters' | 'media_type' | 'status'
  | 'process_code' | 'official_process_code'> & { selected: boolean };

interface VehicleLayers {
  circle: L.Circle;
  marker: L.CircleMarker;
  visual: VisualAsset;
}

interface LayerRendererOptions {
  leaflet: typeof L;
  layer: L.LayerGroup;
  onAssetClick: (id: string, event: L.LeafletMouseEvent) => void;
  onClusterClick: (cluster: MapCluster, event: L.LeafletMouseEvent) => void;
}

function visualAsset(asset: MapAssetSummary, selectedId: string | null): VisualAsset {
  return {
    latitude: asset.latitude,
    longitude: asset.longitude,
    radius_meters: asset.radius_meters,
    media_type: asset.media_type,
    status: asset.status,
    process_code: asset.process_code,
    official_process_code: asset.official_process_code,
    selected: asset.id === selectedId,
  };
}

function circleStyle(visual: VisualAsset) {
  const color = mediaTypeColor(visual.media_type);
  return {
    radius: visual.radius_meters,
    color: visual.selected ? '#b42318' : color,
    fillColor: color,
    fillOpacity: visual.selected ? 0.16 : 0.08,
    weight: visual.selected ? 2 : 1,
  };
}

function markerStyle(visual: VisualAsset) {
  return {
    radius: visual.selected ? 9 : 7,
    color: '#ffffff',
    weight: 2,
    fillColor: mediaTypeColor(visual.media_type),
    fillOpacity: 1,
  };
}

function tooltip(visual: VisualAsset) {
  return `${visual.official_process_code || visual.process_code} · ${mediaTypeLabel(visual.media_type)}`;
}

function circleTooltip(visual: VisualAsset) {
  return `${visual.official_process_code || visual.process_code} · clique para ver detalhes`;
}

export function createMapAssetLayerRenderer({ leaflet, layer, onAssetClick, onClusterClick }: LayerRendererOptions) {
  const vehicles = new Map<string, VehicleLayers>();
  let showingClusters = false;
  let lastClusters: MapCluster[] | null = null;

  function render(items: MapAssetSummary[], clusters: MapCluster[], tooMany: boolean, selectedId: string | null) {
    if (tooMany) {
      if (showingClusters && lastClusters === clusters) return;
      layer.clearLayers();
      vehicles.clear();
      for (const cluster of clusters) {
        const icon = leaflet.divIcon({
          className: 'map-cluster-icon',
          html: `<span>${cluster.count}</span>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        leaflet.marker([cluster.latitude, cluster.longitude], {
          icon,
          title: `${cluster.count} veículos nesta região`,
        }).on('click', (event) => onClusterClick(cluster, event)).addTo(layer);
      }
      showingClusters = true;
      lastClusters = clusters;
      return;
    }

    if (showingClusters) {
      layer.clearLayers();
      showingClusters = false;
      lastClusters = null;
    }

    const nextIds = new Set<string>();
    for (const asset of items) {
      nextIds.add(asset.id);
      const next = visualAsset(asset, selectedId);
      const existing = vehicles.get(asset.id);
      if (!existing) {
        const latLng: L.LatLngExpression = [next.latitude, next.longitude];
        const circle = leaflet.circle(latLng, circleStyle(next))
          .on('click', (event) => onAssetClick(asset.id, event))
          .bindTooltip(circleTooltip(next))
          .addTo(layer);
        circle.bringToBack();
        const marker = leaflet.circleMarker(latLng, markerStyle(next))
          .bindTooltip(tooltip(next))
          .on('click', (event) => onAssetClick(asset.id, event))
          .addTo(layer);
        marker.bringToFront();
        vehicles.set(asset.id, { circle, marker, visual: next });
        continue;
      }

      const previous = existing.visual;
      if (previous.latitude !== next.latitude || previous.longitude !== next.longitude) {
        const latLng: L.LatLngExpression = [next.latitude, next.longitude];
        existing.circle.setLatLng(latLng);
        existing.marker.setLatLng(latLng);
      }
      if (previous.radius_meters !== next.radius_meters) existing.circle.setRadius(next.radius_meters);
      if (previous.media_type !== next.media_type || previous.status !== next.status || previous.selected !== next.selected) {
        existing.circle.setStyle(circleStyle(next));
        existing.marker.setStyle(markerStyle(next));
      }
      if (previous.process_code !== next.process_code
        || previous.official_process_code !== next.official_process_code
        || previous.media_type !== next.media_type) {
        existing.circle.setTooltipContent(circleTooltip(next));
        existing.marker.setTooltipContent(tooltip(next));
      }
      existing.visual = next;
    }

    for (const [id, existing] of vehicles) {
      if (nextIds.has(id)) continue;
      layer.removeLayer(existing.circle);
      layer.removeLayer(existing.marker);
      vehicles.delete(id);
    }
  }

  return { render };
}
