import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Consultation,
  Animal,
  VeterinarianProfile,
  ConsultationStatus,
  Scan
} from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  MessageSquareText,
  PlusCircle,
  ArrowRight,
  Loader2,
  Stethoscope,
  Camera,
  Calendar,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../lib/utils';

export function ConsultationsPage() {
  const [searchParams] = useSearchParams();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [veterinarians, setVeterinarians] = useState<VeterinarianProfile[]>([]);
  const [animalScans, setAnimalScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [selectedVetId, setSelectedVetId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Cancel Confirmation Modal State
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    try {
      const [consRes, animalsRes, vetsRes] = await Promise.all([
        api.consultations.list(),
        api.animals.list(),
        api.veterinarians.listVerified().catch(() => ({ veterinarians: [] }))
      ]);

      setConsultations(consRes.consultations);
      setAnimals(animalsRes.animals);
      setVeterinarians(vetsRes.veterinarians);

      // Handle search parameters for pre-filling
      const paramAnimalId = searchParams.get('animalId');
      const paramScanId = searchParams.get('scanId');

      if (paramAnimalId) {
        setSelectedAnimalId(paramAnimalId);
        setIsModalOpen(true);
      } else if (animalsRes.animals.length > 0 && !selectedAnimalId) {
        setSelectedAnimalId(animalsRes.animals[0].id);
      }

      if (paramScanId) {
        setSelectedScanId(paramScanId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selectedAnimalId changes, load scans for that animal
  useEffect(() => {
    if (!selectedAnimalId) {
      setAnimalScans([]);
      return;
    }
    const animal = animals.find((a) => a.id === selectedAnimalId);
    if (animal && animal.scans) {
      setAnimalScans(animal.scans);
    } else {
      api.animals
        .getById(selectedAnimalId)
        .then((res) => {
          setAnimalScans(res.animal.scans || []);
        })
        .catch(() => setAnimalScans([]));
    }
  }, [selectedAnimalId, animals]);

  const handleRequestConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      setError('Please select an animal.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.consultations.request({
        animalId: selectedAnimalId,
        scanId: selectedScanId || null,
        veterinarianId: selectedVetId || null,
        subject,
        description
      });

      setIsModalOpen(false);
      setSubject('');
      setDescription('');
      setSelectedScanId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit consultation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    setIsCancelling(true);
    try {
      await api.consultations.updateStatus(cancelTargetId, ConsultationStatus.CANCELLED, {
        declineReason: cancelReason || 'Cancelled by pet owner'
      });
      setCancelTargetId(null);
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel consultation');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredConsultations = consultations.filter((c) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') {
      return (
        c.status === ConsultationStatus.REQUESTED ||
        c.status === ConsultationStatus.ACCEPTED ||
        c.status === ConsultationStatus.SCHEDULED ||
        c.status === ConsultationStatus.IN_PROGRESS
      );
    }
    return c.status === filterStatus;
  });

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Veterinary Consultations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Direct clinical dialogue, scan reviews, and diagnostic notes with verified veterinarians
          </p>
        </div>

        <Button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <PlusCircle className="h-4 w-4" /> Request Consultation
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2 border-b border-border pb-3">
        {[
          { key: 'ALL', label: 'All Consultations' },
          { key: 'ACTIVE', label: 'Active & In-Progress' },
          { key: ConsultationStatus.COMPLETED, label: 'Completed' },
          { key: ConsultationStatus.CANCELLED, label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredConsultations.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-card">
          <MessageSquareText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No consultations found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Need clinical guidance on skin lesions, scans, or general health? Request a consultation.
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="sm"
            className="mt-4"
          >
            Request Veterinary Review
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map((con) => {
            const canCancel =
              con.status === ConsultationStatus.REQUESTED ||
              con.status === ConsultationStatus.ACCEPTED ||
              con.status === ConsultationStatus.SCHEDULED;

            return (
              <Card key={con.id} className="hover:border-emerald-500/50 transition-colors">
                <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          con.status === ConsultationStatus.COMPLETED
                            ? 'success'
                            : con.status === ConsultationStatus.IN_PROGRESS
                              ? 'warning'
                              : con.status === ConsultationStatus.CANCELLED
                                ? 'destructive'
                                : 'outline'
                        }
                        className="text-[10px] font-bold"
                      >
                        {con.status}
                      </Badge>

                      {con.scanId && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-300">
                          <Camera className="h-2.5 w-2.5" /> Scan Attached
                        </Badge>
                      )}

                      {con.scheduledAt && (
                        <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Scheduled: {formatDateTime(con.scheduledAt)}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground">
                        &bull; Requested {formatDate(con.createdAt)}
                      </span>
                    </div>

                    <Link
                      to={`/consultations/${con.id}`}
                      className="font-bold text-base text-foreground hover:underline block"
                    >
                      {con.subject}
                    </Link>

                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                      {con.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>
                        Patient: <strong className="text-foreground">{con.animal?.name}</strong> (
                        {con.animal?.species})
                      </span>
                      {con.veterinarian ? (
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3 w-3 text-blue-600" />
                          Dr.{' '}
                          {(con.veterinarian as any).firstName ||
                            (con.veterinarian as any).user?.firstName ||
                            'Assigned Doctor'}{' '}
                          {(con.veterinarian as any).lastName ||
                            (con.veterinarian as any).user?.lastName ||
                            ''}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Awaiting Doctor Assignment
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => {
                          setCancelTargetId(con.id);
                          setCancelReason('');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    )}

                    <Link to={`/consultations/${con.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs whitespace-nowrap">
                        Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Consultation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Veterinary Consultation"
        description="Connect with a licensed veterinarian to evaluate clinical symptoms, scans, and treatment plans"
      >
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Submission Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleRequestConsultation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Patient Animal *
            </label>
            <select
              value={selectedAnimalId}
              onChange={(e) => {
                setSelectedAnimalId(e.target.value);
                setSelectedScanId('');
              }}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {animals.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.species} - {a.breed || 'Breed Unspecified'})
                </option>
              ))}
            </select>
          </div>

          {/* Optional Scan Linkage */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Link Animal Scan (Optional)
            </label>
            <select
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">No scan attached (General Clinical Review)</option>
              {animalScans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.bodyPart || 'Skin Scan'} - {formatDate(s.captureTimestamp)}
                  {s.prediction?.predictedClass ? ` (${s.prediction.predictedClass})` : ''}
                </option>
              ))}
            </select>
            {selectedScanId && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                ✓ The AI model classification and scan image will be securely attached to this consultation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Specific Veterinarian (Optional)
            </label>
            <select
              value={selectedVetId}
              onChange={(e) => setSelectedVetId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Any Available Licensed Practitioner (General Intake Queue)</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  Dr. {v.user?.firstName} {v.user?.lastName} ({v.specialization})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Consultation Subject *"
            placeholder="e.g. Skin lesion on lateral shoulder"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Detailed Clinical Symptoms & Concern *
            </label>
            <textarea
              rows={4}
              placeholder="Describe symptoms, duration, itching, nodule firmness, appetite or behavioral changes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Consultation Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        title="Cancel Consultation Request"
        description="Are you sure you wish to cancel this consultation?"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Once cancelled, the consultation thread is archived. You can initiate a new consultation request at any time.
          </p>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Cancellation Reason (Optional)
            </label>
            <Input
              placeholder="e.g. Symptoms resolved, or requested by mistake"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTargetId(null)}
              disabled={isCancelling}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
