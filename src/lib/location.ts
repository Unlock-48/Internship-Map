export const UNKNOWN_LOCATION_LABEL = "ไม่ทราบข้อมูลสถานที่ฝึกงาน";

export function isMissingLocationValue(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return !normalized || ["ไม่ระบุ", "ไม่ทราบ", "ไม่ทราบจังหวัด", "ไม่ทราบข้อมูลสถานที่ฝึกงาน", "n/a", "ไม่มีข้อมูล"].includes(normalized);
}

export function isUnknownLocationMarked(address: string | null | undefined) {
  return address?.trim() === UNKNOWN_LOCATION_LABEL;
}

export function hasUnknownLocation(company: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  googleMapsUrl?: string | null;
}) {
  return company.latitude == null
    || company.longitude == null
    || isMissingLocationValue(company.googleMapsUrl)
    || isMissingLocationValue(company.address)
    || isMissingLocationValue(company.district)
    || isMissingLocationValue(company.province);
}
