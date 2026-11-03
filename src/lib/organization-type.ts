export const organizationTypes = ["ไม่ระบุ", "ภาคเอกชน", "ภาครัฐ", "Software House"] as const;
export type OrganizationType = (typeof organizationTypes)[number];

export function normalizeOrganizationType(value: string | null | undefined): string {
  const normalized = value?.trim() ?? "";
  if (normalized === "หน่วยงานภาครัฐ" || normalized === "หน่วยงานรัฐ" || normalized === "ภาครัฐ") return "ภาครัฐ";
  if (normalized === "ภาคเอกชน" || normalized === "Software House") return normalized;
  return normalized || "ไม่ระบุ";
}

export function inferOrganizationType(businessType: string): OrganizationType {
  const value = businessType.trim().toLowerCase();
  if (value === "software house") return "Software House";
  if (value.includes("หน่วยงานรัฐ") || value.includes("หน่วยงานภาครัฐ") || value === "ภาครัฐ") return "ภาครัฐ";
  if (value.includes("รัฐวิสาหกิจ")) return "ภาคเอกชน";
  if (value) return "ภาคเอกชน";
  return "ไม่ระบุ";
}
