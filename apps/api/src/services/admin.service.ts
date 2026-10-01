import { prisma } from '../prisma.js';
import { VetVerificationStatus, ModelStatus, ModelFramework } from '@vetvision/shared-types';
import { CreateModelVersionInput } from '@vetvision/validation';
import { NotFoundError } from '../errors.js';
import { logger } from '../logger.js';

export class AdminService {
  public async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          veterinarianProfile: true,
          _count: {
            select: {
              animals: true,
              uploadedScans: true,
              ownerConsultations: true,
              vetConsultations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, page, limit, users };
  }

  public async listVeterinarians(status?: VetVerificationStatus) {
    return prisma.veterinarianProfile.findMany({
      where: status ? { verificationStatus: status } : {},
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async updateVetVerification(userId: string, status: VetVerificationStatus) {
    const profile = await prisma.veterinarianProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundError('Veterinarian profile not found');
    }

    const updated = await prisma.veterinarianProfile.update({
      where: { userId },
      data: { verificationStatus: status }
    });

    logger.event('VET_VERIFICATION_UPDATED', { userId, status });
    return updated;
  }

  public async listModelVersions() {
    return prisma.modelVersion.findMany({
      include: {
        _count: {
          select: { scans: true, predictions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async createModelVersion(input: CreateModelVersionInput) {
    const model = await prisma.modelVersion.create({
      data: {
        name: input.name,
        version: input.version,
        framework: input.framework as ModelFramework,
        artifactUri: input.artifactUri,
        modelSizeBytes: input.modelSizeBytes || null,
        inputWidth: input.inputWidth || 224,
        inputHeight: input.inputHeight || 224,
        accuracy: input.accuracy || null,
        precision: input.precision || null,
        recall: input.recall || null,
        f1Score: input.f1Score || null,
        validationDataset: input.validationDataset || null,
        status: (input.status as ModelStatus) || ModelStatus.CANDIDATE,
        notes: input.notes || null
      }
    });

    logger.event('MODEL_VERSION_CREATED', { modelId: model.id, version: model.version });
    return model;
  }

  public async setModelStatus(modelVersionId: string, status: ModelStatus) {
    const model = await prisma.modelVersion.findUnique({ where: { id: modelVersionId } });
    if (!model) {
      throw new NotFoundError('Model version not found');
    }

    // If activating this model, optionally deactivate others if single active model policy
    if (status === ModelStatus.ACTIVE) {
      await prisma.modelVersion.updateMany({
        where: { id: { not: modelVersionId }, status: ModelStatus.ACTIVE },
        data: { status: ModelStatus.INACTIVE }
      });
    }

    return prisma.modelVersion.update({
      where: { id: modelVersionId },
      data: { status }
    });
  }

  public async listAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, page, limit, logs };
  }
}

export const adminService = new AdminService();
