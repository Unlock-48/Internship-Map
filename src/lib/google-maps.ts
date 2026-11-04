export function extractGoogleMapsCoordinates(value: string | undefined): { latitude: number; longitude: number } | null {
  if (!value) return null;
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  ];
  const candidates = [value];
  try {
    const url = new URL(value);
    candidates.push(decodeURIComponent(url.toString()));
    for (const key of ["q", "query", "ll", "destination"]) {
      const parameter = url.searchParams.get(key);
      if (parameter) candidates.push(parameter);
    }
  } catch {
    candidates.push(value.replace(/\\u003d/gi, "=").replace(/\\u0026/gi, "&"));
  }
  for (const candidate of candidates) {
    for (const pattern of patterns) {
      const match = candidate.match(pattern);
      if (!match) continue;
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) return { latitude, longitude };
    }
  }
  return null;
}

const googleMapsHosts = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "google.com",
  "www.google.com",
  "maps.google.com",
  "google.co.th",
  "www.google.co.th",
  "maps.google.co.th"
]);

function isAllowedGoogleMapsUrl(url: URL) {
  return url.protocol === "https:"
    && !url.username
    && !url.password
    && (!url.port || url.port === "443")
    && googleMapsHosts.has(url.hostname.toLowerCase());
}

export async function resolveGoogleMapsCoordinates(value: string | undefined): Promise<{ latitude: number; longitude: number } | null> {
  if (!value?.trim()) return null;
  const directCoordinates = extractGoogleMapsCoordinates(value);
  if (directCoordinates) return directCoordinates;

  let currentUrl: URL;
  try {
    currentUrl = new URL(value.trim());
  } catch {
    return null;
  }
  if (!isAllowedGoogleMapsUrl(currentUrl)) return null;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const coordinates = extractGoogleMapsCoordinates(currentUrl.toString());
    if (coordinates) return coordinates;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Chiang-Mai-Internship-Map/1.0" },
        cache: "no-store"
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === 5) return null;
      const nextUrl = new URL(location, currentUrl);
      if (!isAllowedGoogleMapsUrl(nextUrl)) return null;
      currentUrl = nextUrl;
      continue;
    }

    await response.body?.cancel();
    return null;
  }
  return null;
}
