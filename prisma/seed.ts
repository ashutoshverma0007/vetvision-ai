import { PrismaClient, UserRole, VetVerificationStatus, AnimalSpecies, AnimalSex, RecordType, MedicationStatus, ConsultationStatus, ModelFramework, ModelStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VetVision AI database seed (DEVELOPMENT ONLY)...');

  // 1. Password hashing with Argon2id
  const ownerPasswordHash = await argon2.hash('DevOwner123!');
  const vetPasswordHash = await argon2.hash('DevVet123!');
  const adminPasswordHash = await argon2.hash('DevAdmin123!');

  // 2. Upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vetvision.ai' },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      firstName: 'Sarah',
      lastName: 'Connor (Admin)'
    },
    create: {
      email: 'admin@vetvision.ai',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      firstName: 'Sarah',
      lastName: 'Connor (Admin)',
      phone: '+1-555-0100',
      emailVerifiedAt: new Date()
    }
  });

  // 3. Upsert Veterinarian User
  const vetUser = await prisma.user.upsert({
    where: { email: 'vet@vetvision.ai' },
    update: {
      passwordHash: vetPasswordHash,
      role: UserRole.VETERINARIAN,
      firstName: 'Marcus',
      lastName: 'Vance'
    },
    create: {
      email: 'vet@vetvision.ai',
      passwordHash: vetPasswordHash,
      role: UserRole.VETERINARIAN,
      firstName: 'Marcus',
      lastName: 'Vance',
      phone: '+1-555-0199',
      emailVerifiedAt: new Date()
    }
  });

  // Upsert Vet Profile
  await prisma.veterinarianProfile.upsert({
    where: { userId: vetUser.id },
    update: {
      licenseNumber: 'VET-TX-987654',
      specialization: 'Large Animal & Bovine Dermatology',
      experienceYears: 12,
      clinicName: 'Lone Star Veterinary Medical Center',
      bio: 'Board-certified veterinary practitioner specializing in cattle epidemiology and dermatological pathology.',
      verificationStatus: VetVerificationStatus.VERIFIED
    },
    create: {
      userId: vetUser.id,
      licenseNumber: 'VET-TX-987654',
      specialization: 'Large Animal & Bovine Dermatology',
      experienceYears: 12,
      clinicName: 'Lone Star Veterinary Medical Center',
      bio: 'Board-certified veterinary practitioner specializing in cattle epidemiology and dermatological pathology.',
      verificationStatus: VetVerificationStatus.VERIFIED
    }
  });

  // 4. Upsert Owner User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@vetvision.ai' },
    update: {
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER,
      firstName: 'John',
      lastName: 'Dutton'
    },
    create: {
      email: 'owner@vetvision.ai',
      passwordHash: ownerPasswordHash,
      role: UserRole.OWNER,
      firstName: 'John',
      lastName: 'Dutton',
      phone: '+1-555-0123',
      emailVerifiedAt: new Date()
    }
  });

  // 5. Seed Animals for Owner
  const bella = await prisma.animal.create({
    data: {
      ownerId: ownerUser.id,
      name: 'Bella',
      species: AnimalSpecies.CATTLE,
      breed: 'Holstein Friesian',
      sex: AnimalSex.FEMALE,
      dateOfBirth: new Date('2023-03-15'),
      weight: 580.5,
      color: 'Black and White',
      identificationNumber: 'RFID-982000412389102',
      notes: 'High-yield dairy heifer. Monitored for skin nodules on lateral neck.'
    }
  });

  const apollo = await prisma.animal.create({
    data: {
      ownerId: ownerUser.id,
      name: 'Apollo',
      species: AnimalSpecies.CATTLE,
      breed: 'Angus',
      sex: AnimalSex.MALE,
      dateOfBirth: new Date('2022-08-10'),
      weight: 810.0,
      color: 'Solid Black',
      identificationNumber: 'RFID-982000554129841',
      notes: 'Breeding bull in pasture 4. Routine checkups normal.'
    }
  });

  const maxDog = await prisma.animal.create({
    data: {
      ownerId: ownerUser.id,
      name: 'Max',
      species: AnimalSpecies.DOG,
      breed: 'Border Collie',
      sex: AnimalSex.MALE_NEUTERED,
      dateOfBirth: new Date('2021-05-20'),
      weight: 22.4,
      color: 'Black and White',
      identificationNumber: 'CHIP-981020004912',
      notes: 'Active working ranch dog. Up-to-date on rabies and DHPP.'
    }
  });

  // 6. Seed Health Records
  await prisma.healthRecord.create({
    data: {
      animalId: bella.id,
      recordedBy: vetUser.id,
      recordType: RecordType.SKIN_LESION,
      title: 'Initial Cutaneous Evaluation - Neck Nodules',
      description: 'Localized firm, circumscribed nodules observed on the left lateral neck and shoulder region. No pyrexia detected at time of exam.',
      diagnosis: 'Suspected mild cutaneous viral eruption; differential includes early Lumpy Skin Disease.',
      treatment: 'Isolate from primary herd, administer prophylactic antipyretic if temperature exceeds 39.5C, follow up with imaging scan.',
      recordedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }
  });

  // 7. Seed Vaccinations
  await prisma.vaccination.create({
    data: {
      animalId: bella.id,
      vaccineName: 'Lumpy Skin Disease Live Attenuated Vaccine (Neethling Strain)',
      administeredDate: new Date('2024-04-10'),
      nextDueDate: new Date('2025-04-10'),
      dose: '2.0 mL Subcutaneous',
      veterinarianId: vetUser.id,
      notes: 'Annual booster administered without adverse reaction.'
    }
  });

  await prisma.vaccination.create({
    data: {
      animalId: maxDog.id,
      vaccineName: 'Rabies 3-Year & DHPP-L4',
      administeredDate: new Date('2024-06-01'),
      nextDueDate: new Date('2027-06-01'),
      dose: '1.0 mL Subcutaneous',
      veterinarianId: vetUser.id,
      notes: 'Rabies certificate #TX-2024-8819 issued.'
    }
  });

  // 8. Seed Medications
  await prisma.medication.create({
    data: {
      animalId: bella.id,
      prescribedBy: vetUser.id,
      name: 'Flunixin Meglumine',
      dosage: '2.2 mg/kg',
      frequency: 'Once daily IV for 3 days',
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      instructions: 'Administer slow intravenous injection. Observe milk withholding period of 36 hours.',
      status: MedicationStatus.COMPLETED
    }
  });

  // 9. Seed Model Versions
  await prisma.modelVersion.upsert({
    where: { version: 'lsd-resnet50-v1.0.0' },
    update: {},
    create: {
      name: 'Lumpy Skin Disease ResNet-50 Baseline',
      version: 'lsd-resnet50-v1.0.0',
      framework: ModelFramework.PYTORCH,
      artifactUri: 'models/lsd_resnet50_v1.0.0.pt',
      modelSizeBytes: 98200000,
      inputWidth: 224,
      inputHeight: 224,
      accuracy: 0.912,
      precision: 0.894,
      recall: 0.925,
      f1Score: 0.909,
      validationDataset: 'BovineDerm-LSD-Val-2024 (n=1200)',
      status: ModelStatus.ACTIVE,
      notes: 'Baseline CNN trained for 3-class bovine lesion screening: Normal, Mild, Severe.'
    }
  });

  // 10. Seed Consultation & Messages
  const consultation = await prisma.consultation.create({
    data: {
      animalId: bella.id,
      ownerId: ownerUser.id,
      veterinarianId: vetUser.id,
      subject: 'Review of neck lesion nodule progression',
      description: 'Noticed three new circumscribed bumps appearing near the left shoulder over the weekend. Seeking clinical review.',
      status: ConsultationStatus.IN_PROGRESS,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  await prisma.consultationMessage.create({
    data: {
      consultationId: consultation.id,
      senderId: ownerUser.id,
      message: 'Hello Dr. Vance, I uploaded a scan of the shoulder area taken this morning. Please let me know your thoughts on the lesion count.'
    }
  });

  await prisma.consultationMessage.create({
    data: {
      consultationId: consultation.id,
      senderId: vetUser.id,
      message: 'Hello John, I have received the consultation request and will examine the scan and Bella’s historical timeline shortly. Keep her separated in paddock B until we review.'
    }
  });

  console.log('✅ Seed completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Development Credentials:');
  console.log('  Admin:  admin@vetvision.ai / DevAdmin123!');
  console.log('  Vet:    vet@vetvision.ai   / DevVet123!');
  console.log('  Owner:  owner@vetvision.ai / DevOwner123!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
