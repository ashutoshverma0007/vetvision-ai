import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔍 Starting End-to-End Live Scanner Verification...');

  const API_URL = 'http://localhost:4000/api/v1';

  // 1. Authenticate as Owner
  console.log('1. Authenticating as Owner (owner@vetvision.ai)...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'owner@vetvision.ai',
      password: 'DevOwner123!'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with HTTP ${loginRes.status}: ${await loginRes.text()}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No session cookie returned from login');
  }

  const sessionCookie = setCookie.split(';')[0];
  const loginData = await loginRes.json();
  console.log(`✅ Authenticated as ${loginData.data.user.firstName} ${loginData.data.user.lastName} (${loginData.data.user.role})`);

  // 2. Fetch Owner Animals
  console.log('2. Fetching Owner cattle profiles...');
  const animalsRes = await fetch(`${API_URL}/animals`, {
    headers: { Cookie: sessionCookie }
  });

  const animalsData = await animalsRes.json();
  const animals = animalsData.data.animals;
  if (!animals || animals.length === 0) {
    throw new Error('No animals found for owner. Seed may be missing.');
  }

  const bella = animals.find(a => a.name === 'Bella') || animals[0];
  console.log(`✅ Selected cattle: ${bella.name} (${bella.species}, RFID: ${bella.identificationNumber}, ID: ${bella.id})`);

  // 3. Upload Cattle Image and Run AI Scanner
  console.log('3. Uploading cattle lesion image for live AI screening...');
  const imagePath = path.resolve('data/storage/0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'demonstration_cattle_lesion.jpg');
  formData.append('bodyPart', 'Lateral Torso & Flank');
  formData.append('symptoms', 'Circumscribed cutaneous nodules detected during morning inspection');

  const scanRes = await fetch(`${API_URL}/animals/${bella.id}/scans`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: formData
  });

  if (!scanRes.ok) {
    throw new Error(`Scan upload failed with HTTP ${scanRes.status}: ${await scanRes.text()}`);
  }

  const scanResult = await scanRes.json();
  const scan = scanResult.data.scan;
  console.log(`✅ Scan created with ID: ${scan.id}`);

  // 4. Verify AI Prediction & Probabilities
  console.log('4. Verifying real ONNX inference prediction...');
  const pred = scan.prediction;
  if (!pred) {
    throw new Error('Scan result is missing prediction record!');
  }

  console.log('   Prediction Status:     ', pred.status);
  console.log('   Predicted Class:       ', pred.predictedClass);
  console.log('   Confidence Score:      ', `${(pred.confidence * 100).toFixed(2)}%`);
  console.log('   Normal Probability:    ', pred.normalProbability);
  console.log('   Mild Probability:      ', pred.mildProbability);
  console.log('   Severe Probability:    ', pred.severeProbability);
  console.log('   Inference Latency:     ', `${pred.inferenceTimeMs?.toFixed(2)} ms`);
  console.log('   Device:                ', pred.deviceType);
  console.log('   Model Version:         ', pred.modelVersion?.version || pred.modelVersionId);

  if (pred.status !== 'AVAILABLE') {
    throw new Error(`Expected PredictionStatus.AVAILABLE but received: ${pred.status}`);
  }

  if (!pred.predictedClass) {
    throw new Error('Prediction is missing predictedClass');
  }

  // Validate probabilities sum to 1
  const sumProbs = (pred.normalProbability || 0) + (pred.mildProbability || 0) + (pred.severeProbability || 0);
  console.log('   Sum of Probabilities:  ', sumProbs.toFixed(4));
  if (Math.abs(sumProbs - 1.0) > 0.005) {
    throw new Error(`Probabilities do not sum to ~1.0: ${sumProbs}`);
  }

  // 5. Verify PostgreSQL Persistence & History Retrieval
  console.log('5. Retrieving persisted scan from database via GET /api/v1/scans/:id...');
  const detailRes = await fetch(`${API_URL}/scans/${scan.id}`, {
    headers: { Cookie: sessionCookie }
  });

  if (!detailRes.ok) {
    throw new Error(`Failed to retrieve persisted scan with HTTP ${detailRes.status}`);
  }

  const detailData = await detailRes.json();
  const retrievedScan = detailData.data.scan;
  console.log(`✅ Successfully retrieved persisted scan ${retrievedScan.id} for animal ${retrievedScan.animal.name}`);
  console.log(`   Persisted File Checksum: ${retrievedScan.fileAsset.checksum}`);
  console.log(`   Persisted File Size:     ${retrievedScan.fileAsset.sizeBytes} bytes`);

  console.log('\n🎉 ALL LIVE SCANNER CHECKS PASSED EMPIRICALLY!');
}

main().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
