export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const COMMUNITY_CATEGORIES = ['OC', 'BC', 'MBC', 'SC', 'ST', 'Other'];

export const getBatchYears = () => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => String(y + 1 - i));
};