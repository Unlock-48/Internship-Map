import { resolveGoogleMapsCoordinates } from "@/lib/google-maps";
import { isMissingLocationValue } from "@/lib/location";
import { provinces } from "@/lib/province";

export type GoogleMapsLocation = {
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  province: string;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  district?: string;
  county?: string;
  municipality?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
};

function firstValue(...values: (string | undefined)[]) {
  return values.map((value) => value?.trim()).find(Boolean) ?? "";
}

function normalizeProvince(...values: string[]) {
  const cleanedValues = values.map((value) => value
    .replace(/^จังหวัด\s*/u, "")
    .replace(/\s*จังหวัด$/u, "")
    .replace(/\s+Province$/i, "")
    .trim());
  return cleanedValues.map((cleaned) => provinces.find((province) => cleaned.includes(province)))
    .find(Boolean) ?? cleanedValues.find(Boolean) ?? "";
}

export async function getLocationFromGoogleMapsUrl(url: string): Promise<GoogleMapsLocation | null> {
  const coordinates = await resolveGoogleMapsCoordinates(url);
  if (!coordinates) return null;

  const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  reverseUrl.searchParams.set("format", "jsonv2");
  reverseUrl.searchParams.set("lat", String(coordinates.latitude));
  reverseUrl.searchParams.set("lon", String(coordinates.longitude));
  reverseUrl.searchParams.set("zoom", "18");
  reverseUrl.searchParams.set("addressdetails", "1");
  reverseUrl.searchParams.set("accept-language", "th");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(reverseUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Chiang-Mai-Internship-Map/1.0" },
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("บริการค้นหาที่อยู่จากพิกัดไม่พร้อมใช้งาน");

  const result = await response.json() as { address?: NominatimAddress };
  const address = result.address;
  if (!address) throw new Error("ไม่พบรายละเอียดที่อยู่จากพิกัดนี้");

  const street = firstValue(address.road, address.pedestrian);
  const addressLine = [
    address.house_number,
    street,
    address.neighbourhood,
    address.suburb
  ].filter(Boolean).join(" ");
  const district = firstValue(
    address.city_district,
    address.district,
    address.county,
    address.municipality
  ).replace(/^(อำเภอ|เขต)\s*/u, "");
  const province = normalizeProvince(
    firstValue(address.state),
    firstValue(address.city, address.town)
  );

  return {
    ...coordinates,
    address: addressLine,
    district,
    province
  };
}
