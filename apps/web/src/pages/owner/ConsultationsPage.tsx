import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Consultation, Animal, VeterinarianProfile, ConsultationStatus } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { MessageSquareText, PlusCircle, ArrowRight, Loader2, Stethoscope, User } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function ConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [veterinarians, setVeterinarians] = useState<VeterinarianProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedVetId, setSelectedVetId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

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
      if (animalsRes.animals.length > 0 && !selectedAnimalId) {
        setSelectedAnimalId(animalsRes.animals[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        veterinarianId: selectedVetId || undefined,
        subject,
        description
      });

      setIsModalOpen(false);
      setSubject('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit consultation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Veterinary Consultations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Direct clinical dialogue and record reviews with board-certified veterinarians
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <PlusCircle className="h-4 w-4" /> Request Consultation
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-card">
          <MessageSquareText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No consultations requested yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Need clinical guidance on skin nodules, vaccinations, or diet? Request your first veterinary review.
          </p>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="mt-4">
            Request Clinical Review
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {consultations.map((con) => (
            <Card key={con.id} className="hover:border-emerald-500/50 transition-colors">
              <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        con.status === ConsultationStatus.COMPLETED
                          ? 'success'
                          : con.status === ConsultationStatus.IN_PROGRESS
                            ? 'warning'
                            : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {con.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">&bull; Requested {formatDate(con.createdAt)}</span>
                  </div>

                  <Link to={`/consultations/${con.id}`} className="font-bold text-base text-foreground hover:underline block">
                    {con.subject}
                  </Link>

                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">{con.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span>Animal: <strong className="text-foreground">{con.animal?.name}</strong> ({con.animal?.species})</span>
                    {con.veterinarian && (
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3 text-blue-600" />
                        Dr. {con.veterinarian.user?.firstName || con.veterinarian.clinicName || 'Assigned Vet'}
                      </span>
                    )}
                  </div>
                </div>

                <Link to={`/consultations/${con.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs whitespace-nowrap">
                    Open Thread <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Consultation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Veterinary Review"
        description="Share animal medical records and scans with a licensed veterinarian"
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
              Select Animal
            </label>
            <select
              value={selectedAnimalId}
              onChange={(e) => setSelectedAnimalId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Select Specific Veterinarian (Optional)
            </label>
            <select
              value={selectedVetId}
              onChange={(e) => setSelectedVetId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Any Available Licensed Practitioner</option>
              {veterinarians.map((v) => (
                <option key={v.userId} value={v.userId}>
                  Dr. {v.user?.firstName} {v.user?.lastName} ({v.specialization})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Consultation Subject"
            placeholder="e.g. Skin nodule review on lateral shoulder"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Detailed Clinical Problem Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe symptoms, duration, fever, nodule firmness, appetite changes..."
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
    </div>
  );
}
