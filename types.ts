export type MapsProviderId = 'google' | 'osm' | 'estimate';

export type LatLng = { lat: number; lng: number };

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  provider: MapsProviderId;
  approximate: boolean;
};

export type AddressSuggestion = {
  label: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
};

export type RouteLeg = {
  from: string;
  to: string;
  distanceKm: number;
};

export type RouteResult = {
  distanceKm: number;
  provider: MapsProviderId;
  approximate: boolean;
  legs: RouteLeg[];
  mapLinks: {
    google: string;
    osm: string;
  };
  warning: string | null;
  orderedAddresses: string[];
};

export type MapsStatus = {
  googleConfigured: boolean;
  osmAvailable: boolean;
  priority: MapsProviderId[];
  hint: string;
};
