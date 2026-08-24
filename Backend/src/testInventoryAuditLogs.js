import 'dotenv/config';
import { prisma } from './server.js';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from './modules/inventory/category.controller.js';
import {
  getItems,
  createItem,
  updateItem,
  deleteItem
} from './modules/inventory/inventory.controller.js';
import {
  getAuditLogs,
  getInboundLogs,
  getOutboundLogs,
  createStockMovement
} from './modules/inventory/auditLog.controller.js';

// Mock response helper
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING INVENTORY CATEGORIES & AUDIT LOGS TEST SUITE');
  console.log('======================================================\n');

  let collegeA, collegeB, userA, userB;
  let catA1, catA2, catB1;
  let itemA1, itemA2;

  try {
    // ---------------------------------------------------------
    // SETUP: Provision Test Tenants and Users
    // ---------------------------------------------------------
    console.log('--- Phase 0: Provisioning Test Tenants ---');
    collegeA = await prisma.college.upsert({
      where: { slug: 'test-college-inventory-a' },
      update: { name: 'Test College A' },
      create: {
        name: 'Test College A',
        slug: 'test-college-inventory-a',
        status: 'active'
      }
    });

    collegeB = await prisma.college.upsert({
      where: { slug: 'test-college-inventory-b' },
      update: { name: 'Test College B' },
      create: {
        name: 'Test College B',
        slug: 'test-college-inventory-b',
        status: 'active'
      }
    });

    userA = await prisma.user.upsert({
      where: { collegeId_email: { collegeId: collegeA.id, email: 'admin.a@test.com' } },
      update: {},
      create: {
        collegeId: collegeA.id,
        email: 'admin.a@test.com',
        name: 'Admin A',
        role: 'admin',
        passwordHash: 'dummy',
        accountStatus: 'active'
      }
    });

    userB = await prisma.user.upsert({
      where: { collegeId_email: { collegeId: collegeB.id, email: 'admin.b@test.com' } },
      update: {},
      create: {
        collegeId: collegeB.id,
        email: 'admin.b@test.com',
        name: 'Admin B',
        role: 'admin',
        passwordHash: 'dummy',
        accountStatus: 'active'
      }
    });

    // Cleanup previous test artifacts for clean state
    await prisma.inventoryAuditLog.deleteMany({
      where: { collegeId: { in: [collegeA.id, collegeB.id] } }
    });
    await prisma.inventoryItem.deleteMany({
      where: { collegeId: { in: [collegeA.id, collegeB.id] } }
    });
    await prisma.productCategory.deleteMany({
      where: { collegeId: { in: [collegeA.id, collegeB.id] } }
    });

    // ---------------------------------------------------------
    // TEST 1: CATEGORY CREATION & CASE-INSENSITIVE UNIQUENESS
    // ---------------------------------------------------------
    console.log('\n--- Phase 1: Category Creation & Uniqueness ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'Stationery',
          code: 'stat',
          description: 'General office stationery'
        }
      };
      const res = createMockRes();
      await createCategory(req, res);
      assert(res.statusCode === 201, 'Category Stationery created with status 201');
      assert(res.body.data.code === 'STAT', 'Category code normalized to uppercase STAT');
      catA1 = res.body.data;
    }

    // Duplicate name check (case-insensitive)
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'stationery', // same name, different casing
          code: 'STAT2'
        }
      };
      const res = createMockRes();
      await createCategory(req, res);
      assert(res.statusCode === 409, 'Duplicate category name in same college rejected with 409 Conflict');
    }

    // Duplicate code check (case-insensitive)
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'Other Stationery',
          code: 'STAT' // duplicate code
        }
      };
      const res = createMockRes();
      await createCategory(req, res);
      assert(res.statusCode === 409, 'Duplicate category code in same college rejected with 409 Conflict');
    }

    // Same code in College B allowed (Tenant isolation)
    {
      const req = {
        tenant: { collegeId: collegeB.id },
        user: { id: userB.id, collegeId: collegeB.id },
        body: {
          name: 'Stationery',
          code: 'STAT',
          description: 'College B stationery'
        }
      };
      const res = createMockRes();
      await createCategory(req, res);
      assert(res.statusCode === 201, 'Same category name/code in different college (Tenant B) allowed with 201');
      catB1 = res.body.data;
    }

    // Create 2nd category in College A (Electronics)
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'Electronics',
          code: 'ELEC',
          description: 'Cables, adapters and screens'
        }
      };
      const res = createMockRes();
      await createCategory(req, res);
      assert(res.statusCode === 201, 'Category Electronics created in College A');
      catA2 = res.body.data;
    }

    // ---------------------------------------------------------
    // TEST 2: CATEGORY LISTING & TENANT ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- Phase 2: Category Listing & Isolation ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: {}
      };
      const res = createMockRes();
      await getCategories(req, res);
      assert(res.statusCode === 200, 'Categories retrieved successfully');
      assert(res.body.data.length === 2, 'College A sees exactly 2 categories');
      assert(res.body.data.every(c => c.collegeId === collegeA.id), 'All returned categories belong to College A');
    }

    // ---------------------------------------------------------
    // TEST 3: PRODUCT CREATION WITH CATEGORY & OPENING STOCK AUDIT
    // ---------------------------------------------------------
    console.log('\n--- Phase 3: Product Creation with Category & Opening Stock ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'A4 Ruled Notebook',
          sku: 'STAT-NOTE-001',
          categoryId: catA1.id,
          quantity: 100 // opening stock
        }
      };
      const res = createMockRes();
      await createItem(req, res);
      assert(res.statusCode === 201, 'Product created with categoryId and opening stock 100');
      assert(res.body.data.productCategory.code === 'STAT', 'Product response includes populated productCategory');
      itemA1 = res.body.data;
    }

    // Verify initial INBOUND audit log was created for opening stock
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: { inventoryItemId: itemA1.id }
      };
      const res = createMockRes();
      await getAuditLogs(req, res);
      assert(res.statusCode === 200, 'Audit logs retrieved for item');
      assert(res.body.data.length === 1, 'Exactly 1 initial opening stock audit log found');
      assert(res.body.data[0].movementType === 'INBOUND', 'Initial audit log is INBOUND');
      assert(res.body.data[0].quantity === 100, 'Initial audit log quantity is 100');
      assert(res.body.data[0].reason === 'Opening Stock', 'Initial audit log reason is Opening Stock');
    }

    // Reject cross-tenant category assignment
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'HDMI Cable',
          sku: 'ELEC-HDMI-001',
          categoryId: catB1.id, // Cross-tenant category from College B
          quantity: 10
        }
      };
      const res = createMockRes();
      await createItem(req, res);
      assert(res.statusCode === 400, 'Assigning College B category to College A product rejected with 400');
    }

    // ---------------------------------------------------------
    // TEST 4: CATEGORY DELETION GUARD
    // ---------------------------------------------------------
    console.log('\n--- Phase 4: Category Deletion Guard ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        params: { id: catA1.id }
      };
      const res = createMockRes();
      await deleteCategory(req, res);
      assert(res.statusCode === 409, 'Deleting category with assigned products rejected with 409 Conflict');
    }

    // ---------------------------------------------------------
    // TEST 5: INBOUND STOCK MOVEMENT
    // ---------------------------------------------------------
    console.log('\n--- Phase 5: Inbound Stock Movement ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          inventoryItemId: itemA1.id,
          movementType: 'INBOUND',
          quantity: 50,
          reason: 'Supplier Delivery',
          notes: 'Received from National Stationers, Invoice #9823'
        }
      };
      const res = createMockRes();
      await createStockMovement(req, res);
      assert(res.statusCode === 201, 'Inbound movement recorded with status 201');
      assert(res.body.data.item.quantity === 150, 'Stock increased from 100 to 150 atomically');
      assert(res.body.data.auditLog.movementType === 'INBOUND', 'Audit log reflects INBOUND');
      assert(res.body.data.auditLog.quantity === 50, 'Audit log quantity is 50');
    }

    // ---------------------------------------------------------
    // TEST 6: OUTBOUND STOCK MOVEMENT & VALIDATION
    // ---------------------------------------------------------
    console.log('\n--- Phase 6: Outbound Stock Movement & Validation ---');
    // Valid Outbound
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          inventoryItemId: itemA1.id,
          movementType: 'OUTBOUND',
          quantity: 30,
          reason: 'Department Issue',
          notes: 'Issued to Department of Computer Science'
        }
      };
      const res = createMockRes();
      await createStockMovement(req, res);
      assert(res.statusCode === 201, 'Outbound movement recorded with status 201');
      assert(res.body.data.item.quantity === 120, 'Stock decreased from 150 to 120 atomically');
    }

    // Outbound exceeding available stock (120 available, requesting 200)
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          inventoryItemId: itemA1.id,
          movementType: 'OUTBOUND',
          quantity: 200,
          reason: 'Excess Issue'
        }
      };
      const res = createMockRes();
      await createStockMovement(req, res);
      assert(res.statusCode === 409, 'Outbound movement exceeding stock rejected with 409 Conflict');

      // Verify stock remained unchanged at 120
      const currentItem = await prisma.inventoryItem.findUnique({ where: { id: itemA1.id } });
      assert(currentItem.quantity === 120, 'Stock remains unchanged at 120 after failed outbound attempt');
    }

    // ---------------------------------------------------------
    // TEST 7: AUDIT LOGS INBOUND & OUTBOUND SUB-ENDPOINTS
    // ---------------------------------------------------------
    console.log('\n--- Phase 7: Audit Logs Querying & Filtering ---');
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: {}
      };
      const resInbound = createMockRes();
      await getInboundLogs(req, resInbound);
      assert(resInbound.body.data.length === 2, 'Found 2 INBOUND records (Opening Stock + Supplier Delivery)');
      assert(resInbound.body.data.every(l => l.movementType === 'INBOUND'), 'All records from getInboundLogs are INBOUND');

      const resOutbound = createMockRes();
      await getOutboundLogs(req, resOutbound);
      assert(resOutbound.body.data.length === 1, 'Found 1 OUTBOUND record (Department Issue)');
      assert(resOutbound.body.data[0].movementType === 'OUTBOUND', 'Record from getOutboundLogs is OUTBOUND');
      assert(resOutbound.body.data[0].quantity === 30, 'Outbound quantity is 30');
    }

    // ---------------------------------------------------------
    // TEST 8: MULTI-TENANCY ISOLATION FOR AUDIT LOGS
    // ---------------------------------------------------------
    console.log('\n--- Phase 8: Multi-Tenancy Isolation for Audit Logs ---');
    {
      const req = {
        tenant: { collegeId: collegeB.id },
        user: { id: userB.id, collegeId: collegeB.id },
        query: {}
      };
      const res = createMockRes();
      await getAuditLogs(req, res);
      assert(res.body.data.length === 0, 'College B sees 0 audit logs from College A');
    }

    // ---------------------------------------------------------
    // TEST 9: SMART PRODUCT DELETION & ARCHIVING
    // ---------------------------------------------------------
    console.log('\n--- Phase 9: Smart Product Deletion & Archiving ---');
    // 9a. Deleting product with historical audit logs -> Archives safely
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        params: { id: itemA1.id }
      };
      const res = createMockRes();
      await deleteItem(req, res);
      assert(res.statusCode === 200, 'Deleting item with audit history succeeds with 200 OK');
      assert(res.body.data.isArchived === true, 'Item is marked as isArchived = true');

      // Verify item is hidden from active items list
      const getActiveReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: {}
      };
      const getActiveRes = createMockRes();
      await getItems(getActiveReq, getActiveRes);
      assert(getActiveRes.body.data.length === 0, 'Archived item is excluded from active inventory list');

      // Verify item appears when filtering for archived
      const getArchivedReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: { status: 'archived' }
      };
      const getArchivedRes = createMockRes();
      await getItems(getArchivedReq, getArchivedRes);
      assert(getArchivedRes.body.data.length === 1, 'Archived item is found when filtering status=archived');
      assert(getArchivedRes.body.data[0].id === itemA1.id, 'Archived item id matches');

      // Verify audit logs are still intact
      const getAuditReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        query: { inventoryItemId: itemA1.id }
      };
      const getAuditRes = createMockRes();
      await getAuditLogs(getAuditReq, getAuditRes);
      assert(getAuditRes.body.data.length >= 3, 'All historical audit logs remain 100% preserved');
    }

    // 9b. Creating a product with 0 stock (no audit logs) -> Hard deletes cleanly
    {
      const createZeroReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        body: {
          name: 'Temporary Mistake Item',
          sku: 'TEMP-001',
          quantity: 0
        }
      };
      const createZeroRes = createMockRes();
      await createItem(createZeroReq, createZeroRes);
      assert(createZeroRes.statusCode === 201, 'Created zero-stock product');
      const tempItemId = createZeroRes.body.data.id;

      const deleteTempReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: userA.id, collegeId: collegeA.id },
        params: { id: tempItemId }
      };
      const deleteTempRes = createMockRes();
      await deleteItem(deleteTempReq, deleteTempRes);
      assert(deleteTempRes.statusCode === 200, 'Deleting item without audit history succeeds with 200 OK');
      assert(deleteTempRes.body.data.isArchived === false, 'Item without audit history is hard-deleted (isArchived = false)');

      const checkDb = await prisma.inventoryItem.findUnique({ where: { id: tempItemId } });
      assert(checkDb === null, 'Item is completely removed from database');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ TEST RUNNER FAILED WITH ERROR:', error);
    process.exit(1);
  } finally {
    // Clean up test data
    if (collegeA && collegeB) {
      await prisma.inventoryAuditLog.deleteMany({
        where: { collegeId: { in: [collegeA.id, collegeB.id] } }
      });
      await prisma.inventoryItem.deleteMany({
        where: { collegeId: { in: [collegeA.id, collegeB.id] } }
      });
      await prisma.productCategory.deleteMany({
        where: { collegeId: { in: [collegeA.id, collegeB.id] } }
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userA?.id, userB?.id].filter(Boolean) } }
      });
      await prisma.college.deleteMany({
        where: { id: { in: [collegeA.id, collegeB.id] } }
      });
    }
    await prisma.$disconnect();
  }
}

runTests();
