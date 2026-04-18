/**
 * Location Service
 * Uses browser Geolocation API + Nominatim reverse geocoding (free, no API key).
 * Falls back gracefully to timezone data if geolocation is unavailable or denied.
 */

export interface LocationInfo {
  city: string;
  region: string;
  country: string;
  timezone: string;
  lat?: number;
  lon?: number;
  displayName: string; // Human-readable "City, Country"
}

const getTimezoneLocation = (): LocationInfo => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = timezone.split('/');
  return {
    city: parts[1]?.replace(/_/g, ' ') || 'Unknown',
    region: parts[1]?.replace(/_/g, ' ') || 'Unknown',
    country: parts[0] || 'Unknown',
    timezone,
    displayName: timezone.replace(/_/g, ' '),
  };
};

/**
 * Get detailed location info.
 * Requests GPS permission once per session.
 * If denied, falls back to timezone-based location.
 */
export const getLocationInfo = async (timeoutMs = 8000): Promise<LocationInfo> => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getTimezoneLocation());
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            {
              headers: { 'Accept-Language': 'en-US,en;q=0.9' },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (!res.ok) throw new Error('Geocoding response error');
          const data = await res.json();
          const addr = data.address ?? {};
          const city =
            addr.city || addr.town || addr.village || addr.county || addr.suburb || 'Unknown';
          const region = addr.state || addr.region || 'Unknown';
          const country = addr.country || 'Unknown';
          resolve({
            city,
            region,
            country,
            timezone,
            lat,
            lon,
            displayName: `${city}, ${country}`,
          });
        } catch {
          // Geocoding failed but we have GPS coords
          resolve({
            city: 'Unknown',
            region: 'Unknown',
            country: 'Unknown',
            timezone,
            lat,
            lon,
            displayName: timezone.replace(/_/g, ' '),
          });
        }
      },
      () => {
        // Geolocation denied or unavailable
        resolve(getTimezoneLocation());
      },
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 300_000 }
    );
  });
};
