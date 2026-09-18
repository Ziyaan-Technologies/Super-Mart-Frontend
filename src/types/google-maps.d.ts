interface GoogleMapsPlacesAutocompleteOptions {
  types?: string[];
  componentRestrictions?: { country: string | string[] };
  fields?: string[];
  [key: string]: any;
}

interface GoogleMapsPlaceResult {
  formatted_address?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  address_components?: Array<{
    long_name: string;
    types: string[];
  }>;
  [key: string]: any;
}

interface GoogleMapsAutocomplete {
  new (input: HTMLInputElement, opts?: GoogleMapsPlacesAutocompleteOptions): GoogleMapsAutocomplete;
  getPlace(): GoogleMapsPlaceResult;
  addListener(event: string, handler: () => void): void;
}

interface GoogleMapsEvent {
  clearInstanceListeners(instance: any): void;
}

interface GoogleMapsPlaces {
  Autocomplete: GoogleMapsAutocomplete;
}

interface GoogleMaps {
  maps: {
    places: GoogleMapsPlaces;
    event: GoogleMapsEvent;
  };
}

declare const google: GoogleMaps;
