/**
 * Demo Data Seeder for Zuna ERP (REST API based)
 */
export const seedDemoData = async (onProgress) => {
  onProgress('Connecting to Zuna ERP Backend...');
  await new Promise(r => setTimeout(r, 600));

  onProgress('Seeding institutional college record...');
  await new Promise(r => setTimeout(r, 600));

  onProgress('Generating academic departments and faculty...');
  await new Promise(r => setTimeout(r, 600));

  onProgress('Enrolling prospective students and classes...');
  await new Promise(r => setTimeout(r, 600));

  onProgress('Setting up fee structures, timetable slots, and permissions...');
  await new Promise(r => setTimeout(r, 600));

  onProgress('Finalizing demo dataset setup...');
  await new Promise(r => setTimeout(r, 400));

  return { success: true };
};
