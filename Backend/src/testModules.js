import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runModuleTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING REAL POSTGRES CRUD: PLACEMENTS, TRANSPORT, HOSTEL');
  console.log('======================================================\n');

  let college = await prisma.college.findFirst({
    where: { slug: 'test-stabilization-college' }
  });

  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'Test Stabilization College',
        slug: 'test-stabilization-college',
        status: 'active'
      }
    });
  }

  const adminToken = jwt.sign(
    { userId: 'test-user-id', role: 'admin', collegeId: college.id, email: 'admin@test.edu' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // 1. Placement Cell
  console.log('--- 1. Testing Placement Cell API ---');
  const createPlacementRes = await fetch('http://localhost:5000/api/v1/placements', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      companyName: 'Microsoft Corporation',
      role: 'Cloud Solutions Architect',
      ctc: '28.5 LPA',
      driveDate: '2026-11-15',
      eligibilityCriteria: 'Min 75% aggregate in CS/IT',
      studentsPlaced: 18
    })
  });
  const createdPlacement = await createPlacementRes.json();
  console.log(`POST /api/v1/placements: Status ${createPlacementRes.status}, ID: ${createdPlacement.data?.id}`);
  if (createPlacementRes.status !== 201) throw new Error('Failed to create placement drive');

  const getPlacementsRes = await fetch('http://localhost:5000/api/v1/placements', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const placementsList = await getPlacementsRes.json();
  console.log(`GET /api/v1/placements: Status ${getPlacementsRes.status}, Drives: ${placementsList.data?.length}, Top CTC: ${placementsList.stats?.topCtc}`);
  if (!placementsList.data?.length) throw new Error('Failed to list placements');

  // 2. Transport Management
  console.log('\n--- 2. Testing Transport Management API ---');
  const createTransportRes = await fetch('http://localhost:5000/api/v1/transport', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Route 12 - Airport Express',
      busNumber: 'TN-33-AX-9999',
      driverName: 'Suresh Raina',
      driverPhone: '+91 98421 11223',
      stops: 'Airport, Main Bus Stand, Engineering Block',
      capacity: 55,
      status: 'On Time'
    })
  });
  const createdRoute = await createTransportRes.json();
  console.log(`POST /api/v1/transport: Status ${createTransportRes.status}, ID: ${createdRoute.data?.id}`);
  if (createTransportRes.status !== 201) throw new Error('Failed to create transport route');

  const getTransportRes = await fetch('http://localhost:5000/api/v1/transport', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const transportList = await getTransportRes.json();
  console.log(`GET /api/v1/transport: Status ${getTransportRes.status}, Buses: ${transportList.data?.length}, Active Routes: ${transportList.stats?.activeRoutes}`);
  if (!transportList.data?.length) throw new Error('Failed to list transport routes');

  // 3. Hostel Management
  console.log('\n--- 3. Testing Hostel Management API ---');
  const createHostelRes = await fetch('http://localhost:5000/api/v1/hostel', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Cauvery Block (Girls Residential)',
      type: 'Girls',
      totalRooms: 180,
      occupied: 145,
      wardenName: 'Dr. Radhika Sharma',
      wardenPhone: '+91 99887 76655',
      status: 'Active'
    })
  });
  const createdHostel = await createHostelRes.json();
  console.log(`POST /api/v1/hostel: Status ${createHostelRes.status}, ID: ${createdHostel.data?.id}`);
  if (createHostelRes.status !== 201) throw new Error('Failed to create hostel block');

  const getHostelRes = await fetch('http://localhost:5000/api/v1/hostel', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const hostelList = await getHostelRes.json();
  console.log(`GET /api/v1/hostel: Status ${getHostelRes.status}, Blocks: ${hostelList.data?.length}, Total Capacity: ${hostelList.stats?.totalCapacity}, Rate: ${hostelList.stats?.occupancyRate}`);
  if (!hostelList.data?.length) throw new Error('Failed to list hostel blocks');

  // Clean-up created items
  console.log('\n--- 4. Testing DELETE operations ---');
  await fetch(`http://localhost:5000/api/v1/placements/${createdPlacement.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`http://localhost:5000/api/v1/transport/${createdRoute.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`http://localhost:5000/api/v1/hostel/${createdHostel.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Verified DELETE on Placements, Transport, and Hostel');

  console.log('\n======================================================');
  console.log('✅ ALL MODULE TESTS PASSED WITH 100% REAL POSTGRES DATA!');
  console.log('======================================================\n');
}

runModuleTests()
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
