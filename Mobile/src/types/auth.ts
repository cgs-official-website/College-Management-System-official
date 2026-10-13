export type Role =
  | 'superadmin'
  | 'admin'
  | 'teacher'
  | 'hod'
  | 'faculty'
  | 'student'
  | 'parent';

export interface AuthSession {
  role: Role;
  accessToken: string;
  refreshToken?: string | null;
}

export interface CurrentUser {
  uid: string;
  email: string;
}

export interface ModulePermission {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type PermissionsMap = Record<string, ModulePermission>;

/** Data returned by GET /auth/me (plus a few fields we add). Extra fields are allowed. */
export interface UserData {
  uid?: string;
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  collegeId?: string;
  collegeName?: string;
  collegeLogo?: string;
  collegeStatus?: string;
  college?: { name?: string; slug?: string; status?: string; logoUrl?: string; [k: string]: any };
  [key: string]: any;
}
