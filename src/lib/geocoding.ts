export type Coordinates = {
  latitude: number;
  longitude: number;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
};

type NominatimReverseResponse = {
  address?: NominatimAddress;
  display_name?: string;
};

const cityCache = new Map<string, string>();
const currentCityStorageKey = "nessuno-escluso-current-city";

export function getStoredCurrentCity() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(currentCityStorageKey) ?? "";
}

export function storeCurrentCity(city: string) {
  if (typeof window === "undefined" || !city.trim()) return;
  window.localStorage.setItem(currentCityStorageKey, city);
}

export async function reverseGeocodeCity({ latitude, longitude }: Coordinates) {
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = cityCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "10",
    addressdetails: "1",
    "accept-language": "it",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("Impossibile leggere il nome della città.");

  const data = (await response.json()) as NominatimReverseResponse;
  const address = data.address;
  const city =
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.county ||
    address?.state ||
    data.display_name?.split(",")[0]?.trim();

  if (!city) throw new Error("Città non trovata.");

  cityCache.set(cacheKey, city);
  storeCurrentCity(city);
  return city;
}
