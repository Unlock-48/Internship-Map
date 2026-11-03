import { InternshipResult, WorkMode } from "@/types/domain";

export type SearchParams = {
  q?: string;
  workModes?: WorkMode[];
  organizationTypes?: string[];
  jobCategories?: string[];
  district?: string;
  paidOnly?: boolean;
  bbox?: { west: number; south: number; east: number; north: number };
};

export function searchInternships(items: InternshipResult[], params: SearchParams): InternshipResult[] {
  const query = params.q?.trim().toLowerCase();
  return items.filter((item) => {
    const text = [item.title, item.description, item.company.name, item.company.district, ...item.positions]
      .join(" ")
      .toLowerCase();
    if (query && !text.includes(query)) return false;
    if (params.workModes?.length && !params.workModes.includes(item.workMode)) return false;
    if (params.organizationTypes?.length && !params.organizationTypes.includes(item.company.organizationType)) return false;
    if (params.jobCategories?.length && !params.jobCategories.includes(item.jobCategory)) return false;
    if (params.district && item.company.district !== params.district) return false;
    if (params.paidOnly && item.allowanceType === "unpaid") return false;
    if (params.bbox) {
      const { west, south, east, north } = params.bbox;
      if (item.company.longitude == null || item.company.latitude == null) return false;
      if (
        item.company.longitude < west ||
        item.company.longitude > east ||
        item.company.latitude < south ||
        item.company.latitude > north
      ) return false;
    }
    return item.status === "open" && item.company.status === "active";
  });
}
