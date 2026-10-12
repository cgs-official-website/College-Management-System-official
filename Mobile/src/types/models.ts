export interface Option { label: string; value: string; }

export interface CollegeUser { id: string; name?: string | null; email?: string | null; }

export interface College {
  id: string;
  name: string;
  registrationNo?: string | null;
  status?: 'active' | 'pending' | 'suspended' | 'rejected' | string;
  createdAt?: string | number | Date | null;
  logoUrl?: string | null;
  logoBase64?: string | null;
  contactEmail?: string | null;
  email?: string | null;
  contactPhone?: string | null;
  phone?: string | null;
  website?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  academicYear?: string | null;
  affiliationCode?: string | null;
  aicteNumber?: string | null;
  ugcCode?: string | null;
  ugcRecognition?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | number | Date | null;
  users?: CollegeUser[];
}

export interface OnboardCollegeResult {
  collegeCode: string;
  registrationNo: string;
  collegeId: string;
  adminEmail: string;
  collegeName: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  customRoleId?: string | null;
  customRole?: { id: string; name: string } | null;
  accountStatus?: string | null;
  createdAt?: string | number | Date | null;
  collegeId?: string | null;
}

export interface ModuleItem {
  id: string;
  key: string;
  label: string;
  description?: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  duration: string;
  storage?: string | null;
  studentCount?: string | null;
  status?: string | null;
  order?: number;
  modules?: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  status?: string | null;
  contentHtml?: string | null;
  updatedAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
}
