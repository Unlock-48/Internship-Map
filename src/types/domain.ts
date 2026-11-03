export type WorkMode = "onsite" | "hybrid" | "remote" | "undisclosed";
export type InternshipStatus = "open" | "closed" | "expired" | "draft" | "archived";
export type AllowanceType = "fixed" | "range" | "unpaid" | "negotiable" | "undisclosed";

export type Company = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  organizationType: string;
  description: string;
  address: string;
  district: string;
  province: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  facebook?: string;
  googleMapsUrl?: string;
  phone?: string;
  email?: string;
  coordinatorName?: string;
  coordinatorTitle?: string;
  coordinatorPhone?: string;
  authorizedName?: string;
  authorizedTitle?: string;
  businessHours?: string;
  advisorRecommendation?: string;
  advisorName?: string;
  status: "active" | "inactive" | "archived";
  lastVerifiedAt: string;
};

export type Internship = {
  id: string;
  companyId: string;
  title: string;
  jobCategory: string;
  description: string;
  qualifications: string[];
  positions: string[];
  universities: string[];
  allUniversities: boolean;
  workMode: WorkMode;
  allowanceType: AllowanceType;
  allowanceMin?: number;
  allowanceMax?: number;
  allowancePeriod: "daily" | "monthly" | "hourly" | "weekly";
  openingsCount?: number;
  applicationEndDate?: string;
  applicationLink?: string;
  status: InternshipStatus;
  lastVerifiedAt: string;
};

export type InternshipResult = Internship & { company: Company };
