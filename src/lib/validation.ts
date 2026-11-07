import { z } from "zod";

export const submissionSchema = z.object({
  companyName: z.string().trim().max(255),
  title: z.string().trim().min(2).max(255),
  workMode: z.enum(["onsite", "hybrid", "remote"]),
  sourceUrl: z.string().url().max(2048).optional().or(z.literal("")),
  description: z.string().trim().min(5).max(5000),
  email: z.string().email().max(320).optional().or(z.literal(""))
});

export const reportSchema = z.object({
  reference: z.string().trim().min(2).max(255),
  reason: z.enum(["ประกาศหมดอายุ", "ข้อมูลไม่ถูกต้อง", "บริษัทปิดกิจการ", "ปัญหาอื่นๆ"]),
  details: z.string().trim().min(5).max(5000)
});

export const importRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  universityCode: z.string().max(100).default(""),
  universityName: z.string().max(255).default(""),
  academicUnitCode: z.string().max(100).default(""),
  academicUnitName: z.string().max(255).default(""),
  companyId: z.string().max(100),
  companyName: z.string().trim().max(255),
  businessType: z.string().max(500),
  companyDescription: z.string().max(10000),
  positionTitle: z.string().trim().max(255),
  jobDescription: z.string().max(10000),
  address: z.string().max(2000),
  road: z.string().max(500),
  subdistrict: z.string().max(255),
  district: z.string().max(255),
  province: z.string().max(255),
  postalCode: z.string().max(20),
  latitude: z.string().max(50),
  longitude: z.string().max(50),
  website: z.string().max(2048),
  facebook: z.string().max(2048),
  phone: z.string().max(100),
  email: z.string().max(320),
  allUrl: z.string().max(2048),
  status: z.string().max(50),
  lastVerifiedAt: z.string().max(100),
  googleMapsUrl: z.string().max(2048),
  coordinatorName: z.string().max(255),
  coordinatorTitle: z.string().max(255),
  coordinatorPhone: z.string().max(100),
  authorizedName: z.string().max(255),
  authorizedTitle: z.string().max(255),
  businessHours: z.string().max(500),
  advisorRecommendation: z.string().max(5000),
  advisorName: z.string().max(255),
  companyExistsInDatabase: z.boolean().default(false),
  duplicateInDatabase: z.boolean().default(false),
  duplicateInFile: z.boolean().default(false),
  errors: z.array(z.string())
});
