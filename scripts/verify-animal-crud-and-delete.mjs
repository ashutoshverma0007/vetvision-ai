async function run() {
  console.log('--- Testing Animal CRUD, Preservation of Hidden Fields, and Safe Deletion ---');
  const API_URL = 'http://localhost:4000/api/v1';

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      throw new Error(`Login failed for ${email} (${res.status}): ${await res.text()}`);
    }
    const cookie = res.headers.get('set-cookie');
    const sessionCookie = cookie ? cookie.split(';')[0] : '';
    const data = await res.json();
    return { sessionCookie, user: data.data.user };
  }

  // 1. Authenticate Owner
  console.log('1. Authenticating as Owner (owner@vetvision.ai)...');
  const ownerAuth = await login('owner@vetvision.ai', 'DevOwner123!');
  console.log(`✅ Authenticated Owner: ${ownerAuth.user.firstName} ${ownerAuth.user.lastName} (${ownerAuth.user.id})`);

  // 2. Authenticate Vet (unauthorized third party for owner's animal)
  console.log('2. Authenticating as Vet (vet@vetvision.ai)...');
  const vetAuth = await login('vet@vetvision.ai', 'DevVet123!');
  console.log(`✅ Authenticated Vet: ${vetAuth.user.firstName} ${vetAuth.user.lastName} (${vetAuth.user.id})`);

  // 3. Create an animal with full initial fields (simplified 3-field form defaults sex to UNKNOWN or specified)
  console.log('3. Creating test animal with full rich attributes (RFID, weight, notes)...');
  const createRes = await fetch(`${API_URL}/animals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: ownerAuth.sessionCookie
    },
    body: JSON.stringify({
      name: 'Highland Daisy',
      species: 'CATTLE',
      breed: 'Scottish Highland',
      sex: 'FEMALE',
      identificationNumber: 'RFID-PRESERVE-9988',
      weight: 520.5,
      notes: 'Contains sensitive veterinary baseline notes that must survive editing.'
    })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create test animal: ${await createRes.text()}`);
  }
  const createData = await createRes.json();
  const animal = createData.data.animal;
  const animalId = animal.id;
  console.log(`✅ Animal created with ID: ${animalId}`);
  console.log(`   Initial identificationNumber: ${animal.identificationNumber}`);
  console.log(`   Initial weight: ${animal.weight}`);
  console.log(`   Initial notes: ${animal.notes}`);
  console.log(`   Initial sex: ${animal.sex}`);

  // 4. Test Simplified Edit (Updating ONLY name, species, breed)
  console.log('4. Executing simplified 3-field edit (changing name to "Highland Daisy Renamed", breed to "Highland Cross")...');
  const updateRes = await fetch(`${API_URL}/animals/${animalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: ownerAuth.sessionCookie
    },
    body: JSON.stringify({
      name: 'Highland Daisy Renamed',
      species: 'CATTLE',
      breed: 'Highland Cross'
    })
  });

  if (!updateRes.ok) {
    throw new Error(`Update failed: ${await updateRes.text()}`);
  }
  const updateData = await updateRes.json();
  const updatedAnimal = updateData.data.animal;
  console.log(`✅ Animal updated. New name: "${updatedAnimal.name}", New breed: "${updatedAnimal.breed}"`);

  // 5. Verify Hidden Fields Were Preserved
  console.log('5. Verifying that hidden attributes were preserved and NOT erased...');
  if (updatedAnimal.identificationNumber !== 'RFID-PRESERVE-9988') {
    throw new Error(`FAIL: identificationNumber was erased: ${updatedAnimal.identificationNumber}`);
  }
  if (updatedAnimal.weight !== 520.5) {
    throw new Error(`FAIL: weight was erased: ${updatedAnimal.weight}`);
  }
  if (updatedAnimal.notes !== 'Contains sensitive veterinary baseline notes that must survive editing.') {
    throw new Error(`FAIL: notes were erased: ${updatedAnimal.notes}`);
  }
  if (updatedAnimal.sex !== 'FEMALE') {
    throw new Error(`FAIL: sex was erased: ${updatedAnimal.sex}`);
  }
  console.log('✅ ALL hidden attributes (RFID, weight, notes, sex) preserved intact!');

  // 6. Test Authorization: User B (Vet) attempts to delete Owner\'s animal
  console.log('6. Testing authorization: Vet attempts to delete Owner\'s animal...');
  const unauthorizedDeleteRes = await fetch(`${API_URL}/animals/${animalId}`, {
    method: 'DELETE',
    headers: {
      Cookie: vetAuth.sessionCookie
    }
  });

  console.log(`   Delete response status code: ${unauthorizedDeleteRes.status}`);
  if (unauthorizedDeleteRes.status !== 403) {
    throw new Error(`FAIL: Expected 403 Forbidden for unauthorized deletion, received ${unauthorizedDeleteRes.status}`);
  }
  console.log('✅ Authorization enforced! Unauthorized user was blocked with 403 Forbidden.');

  // 7. Verify animal is still present after unauthorized attempt
  const verifyStillExists = await fetch(`${API_URL}/animals/${animalId}`, {
    headers: { Cookie: ownerAuth.sessionCookie }
  });
  if (!verifyStillExists.ok) {
    throw new Error(`FAIL: Animal was deleted prematurely: ${verifyStillExists.status}`);
  }
  console.log('✅ Animal record remains intact after rejected delete attempt.');

  // 8. Test Authorized Deletion by Owner
  console.log('8. Testing authorized deletion by Owner...');
  const authorizedDeleteRes = await fetch(`${API_URL}/animals/${animalId}`, {
    method: 'DELETE',
    headers: { Cookie: ownerAuth.sessionCookie }
  });
  if (!authorizedDeleteRes.ok) {
    throw new Error(`FAIL: Expected 200 OK for authorized deletion, received ${authorizedDeleteRes.status}: ${await authorizedDeleteRes.text()}`);
  }
  console.log('✅ Animal successfully deleted by Owner.');

  // 9. Verify Animal is No Longer in Owner's List or Accessible
  console.log('9. Verifying animal is absent from owner listings...');
  const listRes = await fetch(`${API_URL}/animals`, {
    headers: { Cookie: ownerAuth.sessionCookie }
  });
  const listData = await listRes.json();
  const animalsList = listData.data.animals || [];
  const foundInList = animalsList.some((a) => a.id === animalId);
  if (foundInList) {
    throw new Error(`FAIL: Deleted animal ${animalId} is still present in owner animal list!`);
  }
  console.log('✅ Animal confirmed removed from active animal listings.');

  const getDeletedRes = await fetch(`${API_URL}/animals/${animalId}`, {
    headers: { Cookie: ownerAuth.sessionCookie }
  });
  if (getDeletedRes.status !== 404) {
    throw new Error(`FAIL: Expected 404 for deleted animal GET, received ${getDeletedRes.status}`);
  }
  console.log('✅ Direct retrieval correctly returned 404 Not Found.');

  console.log('\n🎉 ALL ANIMAL PROFILE REDESIGN, PRESERVATION & DELETION CHECKS PASSED EMPIRICALLY!');
}

run().catch((err) => {
  console.error('❌ Verification script failed:', err);
  process.exit(1);
});
