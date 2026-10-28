async function run() {
  console.log('🧪 Verifying Consultation Request Fix...');
  const API_URL = 'http://localhost:4000/api/v1';

  // 1. Authenticate Owner
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@vetvision.ai', password: 'DevOwner123!' })
  });
  if (!loginRes.ok) throw new Error(`Owner login failed: ${await loginRes.text()}`);
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

  // 2. Fetch Owner Animals
  const animalsRes = await fetch(`${API_URL}/animals`, { headers: { Cookie: cookie } });
  const animalsData = await animalsRes.json();
  const bella = animalsData.data.animals.find((a) => a.name === 'Bella') || animalsData.data.animals[0];
  console.log(`✅ Selected animal: ${bella.name} (${bella.id})`);

  // 3. Fetch Scans for Bella
  const scansRes = await fetch(`${API_URL}/animals/${bella.id}/scans`, { headers: { Cookie: cookie } });
  const scansData = await scansRes.json();
  const scan = scansData.data?.scans?.[0];
  console.log(`✅ Linked scan: ${scan ? scan.id : 'None'}`);

  // 4. Fetch Verified Veterinarians
  const vetsRes = await fetch(`${API_URL}/veterinarians`, { headers: { Cookie: cookie } });
  const vetsData = await vetsRes.json();
  const vet = vetsData.data.veterinarians?.[0];
  console.log(`✅ Selected veterinarian: Dr. ${vet?.user?.firstName} ${vet?.user?.lastName} (${vet?.userId})`);

  // 5. Test EXACT user payload from screenshot:
  // Subject: "Skin lession"
  // Detailed Clinical Symptoms: "itching" (7 chars)
  console.log('5. Submitting exact payload from screenshot (subject: "Skin lession", description: "itching")...');
  const payload = {
    animalId: bella.id,
    scanId: scan ? scan.id : null,
    veterinarianId: vet ? vet.userId : null,
    subject: 'Skin lession',
    description: 'itching'
  };

  const reqRes = await fetch(`${API_URL}/consultations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify(payload)
  });

  const resData = await reqRes.json();
  console.log(`Response status: ${reqRes.status}`);

  if (reqRes.status !== 201 || !resData.success) {
    throw new Error(`Consultation request rejected: ${JSON.stringify(resData)}`);
  }

  console.log('✅ Consultation request SUCCESSFUL!');
  console.log(`   Consultation ID: ${resData.data.consultation.id}`);
  console.log(`   Status:          ${resData.data.consultation.status}`);
  console.log(`   Subject:         ${resData.data.consultation.subject}`);
  console.log(`   Description:     ${resData.data.consultation.description}`);

  console.log('\n🎉 CONSULTATION REQUEST WITH "itching" SYMPTOM VERIFIED SUCCESSFULLY!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
