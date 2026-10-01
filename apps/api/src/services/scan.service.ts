import { prisma } from '../prisma.js';
import { storage } from '../storage/index.js';
import { aiClient } from './ai-client.service.js';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import { CreateScanInput } from '@vetvision/validation';
import { ScanStatus, PredictionStatus, UserRole, PredictedClass } from '@vetvision/shared-types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.js';
import { logger } from '../logger.js';

export class ScanService {
  public async uploadAndAnalyzeScan(
    animalId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    input: CreateScanInput,
    user: AuthenticatedUser
  ) {
    // 1. Check animal ownership or permission
    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('You can only upload scans for your own animals');
    }

    // 2. Persist media file to isolated storage outside web root
    const saveResult = await storage.saveFile({
      buffer: fileBuffer,
      originalFilename,
      mimeType
    });

    logger.event('FILE_UPLOADED', {
      storageKey: saveResult.storageKey,
      sizeBytes: saveResult.sizeBytes,
      checksum: saveResult.checksum
    });

    // 3. Create FileAsset record
    const fileAsset = await prisma.fileAsset.create({
      data: {
        ownerId: user.id,
        storageKey: saveResult.storageKey,
        originalFilename,
        mimeType: saveResult.mimeType,
        sizeBytes: saveResult.sizeBytes,
        checksum: saveResult.checksum
      }
    });

    // 4. Create Scan record in PROCESSING state
    const scan = await prisma.scan.create({
      data: {
        animalId,
        uploadedBy: user.id,
        fileAssetId: fileAsset.id,
        bodyPart: input.bodyPart || 'Lateral Body / Skin',
        captureTimestamp: input.captureTimestamp || new Date(),
        status: ScanStatus.PROCESSING
      }
    });

    logger.event('SCAN_UPLOADED', { scanId: scan.id, animalId, uploadedBy: user.id });

    // 5. Execute AI inference via internal AI service
    const absoluteImagePath = storage.getAbsolutePath
      ? storage.getAbsolutePath(saveResult.storageKey)
      : saveResult.storageKey;

    const aiResult = await aiClient.infer({
      imagePath: absoluteImagePath,
      imageMimeType: mimeType
    });

    // 6. Look up active model version in DB if version string provided
    let modelVersionRecord = null;
    if (aiResult.modelVersion) {
      modelVersionRecord = await prisma.modelVersion.findUnique({
        where: { version: aiResult.modelVersion }
      });
    }

    // 7. Persist Prediction record
    const prediction = await prisma.prediction.create({
      data: {
        scanId: scan.id,
        modelVersionId: modelVersionRecord?.id || null,
        predictedClass: (aiResult.predictedClass as PredictedClass) || null,
        confidence: aiResult.confidence ?? null,
        normalProbability: aiResult.normalProbability ?? null,
        mildProbability: aiResult.mildProbability ?? null,
        severeProbability: aiResult.severeProbability ?? null,
        inferenceTimeMs: aiResult.inferenceTimeMs ?? null,
        preprocessingVersion: aiResult.preprocessingVersion || '1.0.0',
        deviceType: aiResult.deviceType || 'cpu',
        status: aiResult.status
      }
    });

    // 8. Determine final Scan status
    let finalScanStatus: ScanStatus;
    if (aiResult.status === PredictionStatus.AVAILABLE) {
      finalScanStatus = ScanStatus.COMPLETED;
    } else if (aiResult.status === PredictionStatus.LOW_CONFIDENCE || aiResult.status === PredictionStatus.MODEL_UNAVAILABLE) {
      finalScanStatus = ScanStatus.REVIEW_REQUIRED;
    } else {
      finalScanStatus = ScanStatus.FAILED;
    }

    const updatedScan = await prisma.scan.update({
      where: { id: scan.id },
      data: {
        status: finalScanStatus,
        modelVersionId: modelVersionRecord?.id || null,
        completedAt: new Date()
      },
      include: {
        fileAsset: true,
        prediction: {
          include: { modelVersion: true }
        },
        animal: {
          select: { id: true, name: true, species: true }
        }
      }
    });

    return updatedScan;
  }

  public async getScanById(scanId: string, user: AuthenticatedUser) {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        fileAsset: true,
        prediction: {
          include: { modelVersion: true }
        },
        animal: {
          include: {
            owner: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        }
      }
    });

    if (!scan) {
      throw new NotFoundError('Scan not found');
    }

    // Ownership and consultation check
    if (user.role === UserRole.OWNER && scan.animal.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized to access this scan');
    }

    if (user.role === UserRole.VETERINARIAN && scan.animal.ownerId !== user.id) {
      const activeConsultation = await prisma.consultation.findFirst({
        where: { animalId: scan.animalId, veterinarianId: user.id }
      });
      if (!activeConsultation) {
        throw new ForbiddenError('Not authorized to view scan without assigned consultation');
      }
    }

    return scan;
  }

  public async listScansForAnimal(animalId: string, user: AuthenticatedUser) {
    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized');
    }

    return prisma.scan.findMany({
      where: { animalId },
      include: {
        fileAsset: true,
        prediction: { include: { modelVersion: true } }
      },
      orderBy: { captureTimestamp: 'desc' }
    });
  }

  public async listRecentScans(user: AuthenticatedUser) {
    const whereClause = user.role === UserRole.OWNER ? { animal: { ownerId: user.id } } : {};

    return prisma.scan.findMany({
      where: whereClause,
      include: {
        fileAsset: true,
        prediction: true,
        animal: { select: { id: true, name: true, species: true } }
      },
      orderBy: { captureTimestamp: 'desc' },
      take: 10
    });
  }
}

export const scanService = new ScanService();
