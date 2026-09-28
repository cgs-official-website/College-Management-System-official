import 'dotenv/config';
import dns from 'node:dns/promises';
import net from 'node:net';

const url = process.env.REDIS_URL || '';

if (!url) {
  console.log('❌ REDIS_URL is NOT set in .env');
  process.exit(1);
}

console.log('\n══════════════════════════════════════════');
console.log('        REDIS URL DIAGNOSTIC TOOL        ');
console.log('══════════════════════════════════════════\n');

// ── 1. Parse URL ────────────────────────────────────────────────
let parsed;
try {
  parsed = new URL(url);
} catch (e) {
  console.log('❌ REDIS_URL is INVALID format:', e.message);
  console.log('   Expected: redis://user:password@host:port');
  process.exit(1);
}

const host = parsed.hostname;
const port = Number(parsed.port) || 6379;

console.log('📋 URL Analysis (credentials hidden):');
console.log('   Protocol :', parsed.protocol);
console.log('   Host     :', host);
console.log('   Port     :', port);
console.log('   Username :', parsed.username || '(none)');
console.log('   Password :', parsed.password ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('');

// ── 2. Classify URL type ──────────────────────────────────────
const isRailwayInternal = host.includes('.internal');
const isRailwayPublic   = host.includes('.rlwy.net') || host.includes('.railway.app');
const isUpstash         = host.includes('.upstash.io');
const isRedisCloud      = host.includes('.redislabs.com') || host.includes('.redis.cloud');
const isLocal           = host === 'localhost' || host === '127.0.0.1';

if (isRailwayInternal) {
  console.log('🏷️  TYPE: Railway INTERNAL URL');
  console.log('   ⚠️  This ONLY works inside Railway cloud deployment.');
  console.log('   ❌  Cannot connect from your local machine!\n');
  console.log('🔧 FIX: Get the PUBLIC URL from Railway Dashboard:');
  console.log('   1. Go to https://railway.app → Your Project');
  console.log('   2. Click on Redis service');
  console.log('   3. Click "Connect" tab');
  console.log('   4. Copy the PUBLIC URL (looks like):');
  console.log('      redis://default:PASS@roundhouse.proxy.rlwy.net:PORT');
  console.log('   5. Replace REDIS_URL in your .env with this Public URL\n');
  process.exit(0);
} else if (isRailwayPublic) {
  console.log('🏷️  TYPE: Railway PUBLIC URL ✅');
} else if (isUpstash) {
  console.log('🏷️  TYPE: Upstash Redis ✅');
} else if (isRedisCloud) {
  console.log('🏷️  TYPE: Redis Cloud ✅');
} else if (isLocal) {
  console.log('🏷️  TYPE: Local Redis');
} else {
  console.log('🏷️  TYPE: Custom/Unknown Redis host');
}

// ── 3. DNS Resolution ──────────────────────────────────────────
console.log('\n🔎 Step 1: DNS Resolution...');
try {
  const addresses = await dns.lookup(host);
  console.log(`   ✅ DNS resolved: ${host} → ${addresses.address}`);
} catch (err) {
  console.log(`   ❌ DNS FAILED: Cannot resolve "${host}"`);
  console.log(`      Error: ${err.message}`);
  console.log('      → Host does not exist or is not reachable from your network.');
  process.exit(1);
}

// ── 4. TCP Port Connectivity ───────────────────────────────────
console.log(`\n🔎 Step 2: TCP Connection to ${host}:${port}...`);
await new Promise((resolve) => {
  const socket = new net.Socket();
  const timeout = 5000;

  socket.setTimeout(timeout);

  socket.connect(port, host, () => {
    console.log(`   ✅ TCP Connected to ${host}:${port} successfully!`);
    socket.destroy();
    resolve(true);
  });

  socket.on('error', (err) => {
    console.log(`   ❌ TCP Connection FAILED: ${err.message}`);
    console.log('      → Port is blocked, firewall issue, or wrong port number.');
    socket.destroy();
    resolve(false);
  });

  socket.on('timeout', () => {
    console.log(`   ❌ TCP Connection TIMED OUT after ${timeout/1000}s`);
    console.log('      → Host unreachable or port blocked by firewall.');
    socket.destroy();
    resolve(false);
  });
});

// ── 5. Redis Ping via ioredis ──────────────────────────────────
console.log('\n🔎 Step 3: Redis PING test...');
try {
  const Redis = (await import('ioredis')).default;
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  client.on('error', () => {});

  try {
    await client.connect();
    const pong = await client.ping();
    console.log(`   ✅ Redis PING → ${pong}`);

    await client.set('zuna_test_key', 'Hello Redis!');
    const val = await client.get('zuna_test_key');
    await client.del('zuna_test_key');
    console.log(`   ✅ SET/GET test → "${val}"`);
    console.log('\n✅ Redis is FULLY WORKING from your local machine!\n');
  } catch (err) {
    console.log(`   ❌ Redis AUTH/command failed: ${err.message}`);
    if (err.message.includes('NOAUTH') || err.message.includes('WRONGPASS')) {
      console.log('      → Wrong password in REDIS_URL');
    }
  } finally {
    client.disconnect();
  }
} catch (e) {
  console.log('   ⚠️  Could not run Redis ping test:', e.message);
}

console.log('══════════════════════════════════════════\n');
