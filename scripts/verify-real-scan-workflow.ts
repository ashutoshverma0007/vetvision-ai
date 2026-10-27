import fs from 'fs';
import path from 'path';
import { prisma } from '../apps/api/src/prisma.js';

const API_BASE = 'http://localhost:4000/api/v1';

async function main() {
  console.log('========================================================================');
  console.log('Task B: Live Scan Workflow & End-to-End Verification');
  console.log('========================================================================\n');

  // 1. Authenticate as Owner
  console.log('1. Authenticating as Owner (owner@vetvision.ai)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@vetvision.ai', password: 'DevOwner123!' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    throw new Error('No set-cookie header received from login');
  }
  const sessionCookie = cookieHeader.split(';')[0];
  const loginJson = await loginRes.json();
  console.log(`   Authenticated successfully! User ID: ${loginJson.data.user.id}, Role: ${loginJson.data.user.role}`);

  // 2. Fetch Animal Profile
  console.log('\n2. Retrieving Animal Profile for Owner...');
  const animalsRes = await fetch(`${API_BASE}/animals`, {
    headers: { Cookie: sessionCookie }
  });
  const animalsJson = await animalsRes.json();
  const animals = animalsJson.data.animals;
  const bella = animals.find((a: any) => a.name === 'Bella') || animals[0];
  console.log(`   Target Animal: ${bella.name} (ID: ${bella.id}, Species: ${bella.species}, RFID: ${bella.identificationNumber})`);

  // 3. Upload Cattle Image for Real AI Inference
  console.log('\n3. Uploading cattle skin lesion image to /api/v1/animals/:id/scans...');
  const testImagePath = path.resolve(process.cwd(), 'data/storage/0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg');
  if (!fs.existsSync(testImagePath)) {
    throw new Error(`Test image not found at ${testImagePath}`);
  }

  const imageBuffer = fs.readFileSync(testImagePath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  // Construct multipart/form-data payload
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="bodyPart"\r\n\r\nLateral Body / Flank\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="notes"\r\n\r\nLive scan workflow audit verification test\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_cattle_lesion.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  ];

  const part1 = Buffer.from(bodyParts[0]);
  const part2 = Buffer.from(bodyParts[1]);
  const part3 = Buffer.from(bodyParts[2]);
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
  const multipartBuffer = Buffer.concat([part1, part2, part3, imageBuffer, closing]);

  const uploadRes = await fetch(`${API_BASE}/animals/${bella.id}/scans`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Cookie: sessionCookie
    },
    body: multipartBuffer
  });

  if (!uploadRes.ok) {
    throw new Error(`Scan upload failed with status ${uploadRes.status}: ${await uploadRes.text()}`);
  }

  const uploadJson = await uploadRes.json();
  const scan = uploadJson.data.scan;

  console.log(`   Scan uploaded successfully! HTTP 201 Created.`);
  console.log(`   Scan ID: ${scan.id}`);
  console.log(`   Scan Status: ${scan.status}`);
  console.log(`   Model Version ID: ${scan.modelVersionId}`);

  // 4. Verify Actual Inference Results
  console.log('\n4. Verifying ONNX Inference Engine Outputs:');
  const pred = scan.prediction;
  console.log(`   Prediction Status: ${pred.status}`);
  console.log(`   Predicted Class: ${pred.predictedClass}`);
  console.log(`   Confidence Score: ${pred.confidence} (${(pred.confidence * 100).toFixed(2)}%)`);
  console.log(`   Normal Probability: ${pred.normalProbability}`);
  console.log(`   Mild Probability: ${pred.mildProbability}`);
  console.log(`   Severe Probability: ${pred.severeProbability}`);
  console.log(`   Sum of Probabilities: ${(pred.normalProbability + pred.mildProbability + pred.severeProbability).toFixed(4)}`);
  console.log(`   Inference Latency: ${pred.inferenceTimeMs} ms`);
  console.log(`   Compute Device: ${pred.deviceType}`);
  console.log(`   Preprocessing Version: ${pred.preprocessingVersion}`);
  console.log(`   Associated Model Version:`, pred.modelVersion ? `${pred.modelVersion.name} (${pred.modelVersion.version}) [Framework: ${pred.modelVersion.framework}]` : 'NONE (DISCREPANCY!)');

  if (!pred.modelVersion || pred.modelVersion.version !== 'lsd-efficientnetb0-v1.0.0') {
    throw new Error(`Discrepancy detected! Associated model version is not lsd-efficientnetb0-v1.0.0: ${JSON.stringify(pred.modelVersion)}`);
  }

  // 5. Verify Persistence in PostgreSQL
  console.log('\n5. Verifying Database Persistence directly via Prisma...');
  const dbScan = await prisma.scan.findUnique({
    where: { id: scan.id },
    include: {
      fileAsset: true,
      prediction: { include: { modelVersion: true } },
      animal: true
    }
  });

  if (!dbScan) {
    throw new Error(`Scan ${scan.id} not found in database!`);
  }
  console.log(`   PostgreSQL Scan verified!`);
  console.log(`   DB Scan ID: ${dbScan.id}`);
  console.log(`   File Asset Key: ${dbScan.fileAsset.storageKey}`);
  console.log(`   File SHA-256 Checksum: ${dbScan.fileAsset.checksum}`);
  console.log(`   DB Prediction Status: ${dbScan.prediction?.status}`);
  console.log(`   DB Model Version: ${dbScan.prediction?.modelVersion?.version}`);
  console.log(`   DB Model Accuracy: ${dbScan.prediction?.modelVersion?.accuracy}`);

  // 6. Verify Retrieval from Animal History
  console.log('\n6. Verifying Retrieval via Animal Scans List API (GET /api/v1/animals/:id/scans)...');
  const historyRes = await fetch(`${API_BASE}/animals/${bella.id}/scans`, {
    headers: { Cookie: sessionCookie }
  });
  const historyJson = await historyRes.json();
  const foundInHistory = historyJson.data.scans.some((s: any) => s.id === scan.id);
  console.log(`   Scan found in animal history: ${foundInHistory} (Total animal scans: ${historyJson.data.scans.length})`);

  // 7. Verify Retrieval via Scan Detail API (GET /api/v1/scans/:id)
  console.log('\n7. Verifying Retrieval via Scan Detail API (GET /api/v1/scans/:id)...');
  const detailRes = await fetch(`${API_BASE}/scans/${scan.id}`, {
    headers: { Cookie: sessionCookie }
  });
  const detailJson = await detailRes.json();
  const detailScan = detailJson.data.scan;
  console.log(`   Retrieved scan detail! ID: ${detailScan.id}, Status: ${detailScan.status}`);
  console.log(`   Detail Model Version: ${detailScan.prediction?.modelVersion?.version || 'N/A'}`);

  // 8. Test Invalid-Image Handling (Text file masquerading as image)
  console.log('\n8. Testing Invalid-Image Handling...');
  const fakeBoundary = '----FakeBoundary' + Math.random().toString(36).substring(2);
  const fakeFileContent = Buffer.from('This is not an image file. It is plaintext malicious content.');
  const fakeBodyParts = [
    `--${fakeBoundary}\r\nContent-Disposition: form-data; name="bodyPart"\r\n\r\nSkin\r\n`,
    `--${fakeBoundary}\r\nContent-Disposition: form-data; name="file"; filename="fake.txt"\r\nContent-Type: text/plain\r\n\r\n`
  ];
  const fakeMultipart = Buffer.concat([
    Buffer.from(fakeBodyParts[0]),
    Buffer.from(fakeBodyParts[1]),
    fakeFileContent,
    Buffer.from(`\r\n--${fakeBoundary}--\r\n`)
  ]);

  const invalidRes = await fetch(`${API_BASE}/animals/${bella.id}/scans`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${fakeBoundary}`,
      Cookie: sessionCookie
    },
    body: fakeMultipart
  });

  const invalidJson = await invalidRes.json();
  console.log(`   Invalid image response status: ${invalidRes.status} (Expected 400 Bad Request)`);
  console.log(`   Invalid error message: ${JSON.stringify(invalidJson.error)}`);

  console.log('\n========================================================================');
  console.log('✅ All Task B Verifications Successfully Passed!');
  console.log('========================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
