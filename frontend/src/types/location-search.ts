export interface LocationItemResponse {
  type: string;
  properties: {
    osm_type: string;
    osm_id: number;
    osm_key: string;
    osm_value: string;
    type: string;
    name: string;
    city?: string;
    county: string;
    state: string;
    country: string;
    postcode: string;
    countrycode: string;
  };
  geometry: {
    type: string;
    coordinates: number[];
  };
}

export interface LocationResponse {
  type: string;
  features: LocationItemResponse[];
}

export interface Location {
  displayName: string; // city, state, country - countryCode
  city?: string;
  state?: string;
  country: string;
  countryCode: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  place_id?: number;
}
