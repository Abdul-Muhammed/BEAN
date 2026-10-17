import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Supercluster from 'supercluster';
import CafeMarker, { useSettledKey, zoomLevelForDelta, type ZoomLevel } from './CafeMarker';
import type { MarkerKind } from '../../constants/mapMarkerIcons';
import { zoomForLongitudeDelta, type MapPin } from '../../lib/mapSearch';

// Apple-Maps-like custom style for Google Maps on Android. Hides POI/transit
// noise so cafe markers are the visual focus.
const APPLE_LIKE_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

/** Wait this long after the map stops before reporting the region, so a fling
 *  or a pinch that settles in steps produces one fetch, not several. */
const SETTLE_DEBOUNCE_MS = 300;
/** Below this zoom, nearby pins are grouped into numbered clusters. */
const CLUSTER_BELOW_ZOOM = 12;

export interface CafeMapHandle {
  animateToRegion: (region: Region, durationMs?: number) => void;
  animateToCoordinate: (
    coords: { latitude: number; longitude: number },
    durationMs?: number
  ) => void;
}

interface CafeMapProps {
  initialRegion: Region;
  pins: MapPin[];
  kindFor: (placeId: string) => MarkerKind;
  selectedId: string | null;
  showsUserLocation: boolean;
  /** Called once the map has settled after a move (debounced). */
  onRegionSettled: (region: Region) => void;
  onPinPress: (placeId: string) => void;
  onMapPress?: () => void;
}

type PinProps = { placeId: string; tier: MapPin['pin_tier']; name: string | null; rating: number | null };

const CafeMap = forwardRef<CafeMapHandle, CafeMapProps>(function CafeMap(
  {
    initialRegion,
    pins,
    kindFor,
    selectedId,
    showsUserLocation,
    onRegionSettled,
    onPinPress,
    onMapPress,
  },
  ref
) {
  const mapRef = useRef<MapView | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [region, setRegion] = useState<Region>(initialRegion);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (next, durationMs = 500) =>
        mapRef.current?.animateToRegion(next, durationMs),
      animateToCoordinate: (coords, durationMs = 500) =>
        mapRef.current?.animateCamera({ center: coords }, { duration: durationMs }),
    }),
    []
  );

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    []
  );

  const handleRegionChangeComplete = useCallback(
    (next: Region) => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        setRegion(next);
        onRegionSettled(next);
      }, SETTLE_DEBOUNCE_MS);
    },
    [onRegionSettled]
  );

  const zoom: ZoomLevel = zoomLevelForDelta(region.longitudeDelta);
  const zoomNumber = zoomForLongitudeDelta(region.longitudeDelta);
  const clustering = zoomNumber < CLUSTER_BELOW_ZOOM;

  // Rebuilt only when the pin set changes, not on every pan.
  const index = useMemo(() => {
    const sc = new Supercluster<PinProps>({ radius: 60, maxZoom: CLUSTER_BELOW_ZOOM });
    sc.load(
      pins.map((pin) => ({
        type: 'Feature' as const,
        properties: {
          placeId: pin.place_id,
          tier: pin.pin_tier,
          name: pin.name,
          rating: pin.rating,
        },
        geometry: { type: 'Point' as const, coordinates: [pin.longitude, pin.latitude] },
      }))
    );
    return sc;
  }, [pins]);

  const clusters = useMemo(() => {
    if (!clustering) return null;
    const west = region.longitude - region.longitudeDelta / 2;
    const east = region.longitude + region.longitudeDelta / 2;
    const south = region.latitude - region.latitudeDelta / 2;
    const north = region.latitude + region.latitudeDelta / 2;
    return index.getClusters([west, south, east, north], Math.floor(zoomNumber));
  }, [clustering, index, region, zoomNumber]);

  const handleClusterPress = useCallback(
    (clusterId: number, latitude: number, longitude: number) => {
      const expansionZoom = Math.min(index.getClusterExpansionZoom(clusterId), 20);
      const longitudeDelta = 360 / 2 ** expansionZoom;
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          longitudeDelta,
          latitudeDelta: longitudeDelta * (region.latitudeDelta / region.longitudeDelta),
        },
        400
      );
    },
    [index, region.latitudeDelta, region.longitudeDelta]
  );

  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  return (
    <MapView
      ref={mapRef}
      provider={mapProvider}
      style={styles.map}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsTraffic={false}
      toolbarEnabled={false}
      customMapStyle={Platform.OS === 'android' ? APPLE_LIKE_MAP_STYLE : undefined}
      onRegionChangeComplete={handleRegionChangeComplete}
      onPress={onMapPress}
    >
      {clusters
        ? clusters.map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;
            const props = feature.properties as any;
            if (props.cluster) {
              return (
                <ClusterMarker
                  key={`cluster-${props.cluster_id}`}
                  clusterId={props.cluster_id}
                  count={props.point_count}
                  latitude={latitude}
                  longitude={longitude}
                  onPress={handleClusterPress}
                />
              );
            }
            const pin = props as PinProps;
            return (
              <CafeMarker
                key={pin.placeId}
                id={pin.placeId}
                latitude={latitude}
                longitude={longitude}
                name={pin.name}
                rating={pin.rating}
                tier={pin.tier}
                kind={kindFor(pin.placeId)}
                zoom={zoom}
                selected={pin.placeId === selectedId}
                onPress={onPinPress}
              />
            );
          })
        : pins.map((pin) => (
            <CafeMarker
              key={pin.place_id}
              id={pin.place_id}
              latitude={pin.latitude}
              longitude={pin.longitude}
              name={pin.name}
              rating={pin.rating}
              tier={pin.pin_tier}
              kind={kindFor(pin.place_id)}
              zoom={zoom}
              selected={pin.place_id === selectedId}
              onPress={onPinPress}
            />
          ))}
    </MapView>
  );
});

const ClusterMarker = React.memo(function ClusterMarker({
  clusterId,
  count,
  latitude,
  longitude,
  onPress,
}: {
  clusterId: number;
  count: number;
  latitude: number;
  longitude: number;
  onPress: (clusterId: number, latitude: number, longitude: number) => void;
}) {
  const lookKey = String(count);
  const tracks = useSettledKey(lookKey) !== lookKey;

  const size = count >= 100 ? 48 : count >= 20 ? 40 : 34;
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      onPress={(e) => {
        e.stopPropagation?.();
        onPress(clusterId, latitude, longitude);
      }}
    >
      <View
        collapsable={false}
        style={[styles.cluster, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={styles.clusterText}>{count >= 1000 ? '999+' : count}</Text>
      </View>
    </Marker>
  );
});

export default CafeMap;

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFCDAB',
    borderWidth: 2,
    borderColor: '#612B05',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterText: {
    fontSize: 13,
    fontFamily: 'Lato-Bold',
    color: '#612B05',
  },
});
