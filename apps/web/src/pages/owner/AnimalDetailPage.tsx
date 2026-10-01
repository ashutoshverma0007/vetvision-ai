import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Animal, TimelineEvent, RecordType, MedicationStatus } from '@vetvision/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Activity,
  Camera,
  FilePlus,
  Syringe,
  Pill,
  Clock,
  Calendar,
  Layers,
  ShieldAlert,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../lib/utils';

export function AnimalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineStats, setTimelineStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'scans' | 'records' | 'vaccines' | 'meds'>('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Health Record Form
  const [recordTitle, setRecordTitle] = useState('');
  const [recordType, setRecordType] = useState<RecordType>(RecordType.SKIN_LESION);
  const [recordDesc, setRecordDesc] = useState('');
  const [recordDiagnosis, setRecordDiagnosis] = useState('');
  const [recordTreatment, setRecordTreatment] = useState('');

  // Vaccine Form
  const [vaccineName, setVaccineName] = useState('');
  const [administeredDate, setAdministeredDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [vaccineDose, setVaccineDose] = useState('2.0 mL Subcutaneous');
  const [vaccineNotes, setVaccineNotes] = useState('');

  // Medication Form
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Once daily');
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [medEndDate, setMedEndDate] = useState('');
  const [medInstructions, setMedInstructions] = useState('');

  const loadData = async () => {
    if (!id) return;
    try {
      const [animalRes, timelineRes] = await Promise.all([
        api.animals.getById(id),
        api.animals.getTimeline(id).catch(() => ({ animal: {}, stats: null, events: [] }))
      ]);

      setAnimal(animalRes.animal);
      setTimeline(timelineRes.events);
      setTimelineStats(timelineRes.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load animal profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.health.createRecord(id, {
        title: recordTitle,
        recordType,
        description: recordDesc,
        diagnosis: recordDiagnosis || undefined,
        treatment: recordTreatment || undefined
      });
      setIsHealthModalOpen(false);
      setRecordTitle('');
      setRecordDesc('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.health.createVaccination(id, {
        vaccineName,
        administeredDate: new Date(administeredDate),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        dose: vaccineDose || undefined,
        notes: vaccineNotes || undefined
      });
      setIsVaccineModalOpen(false);
      setVaccineName('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.health.createMedication(id, {
        name: medName,
        dosage: medDosage,
        frequency: medFrequency,
        startDate: new Date(medStartDate),
        endDate: medEndDate ? new Date(medEndDate) : undefined,
        instructions: medInstructions || undefined,
        status: MedicationStatus.ACTIVE
      });
      setIsMedModalOpen(false);
      setMedName('');
      setMedDosage('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="container py-16 max-w-xl text-center">
        <Alert variant="destructive">
          <AlertTitle>Profile Error</AlertTitle>
          <AlertDescription>{error || 'Animal not found'}</AlertDescription>
        </Alert>
        <Link to="/animals">
          <Button variant="outline" className="mt-4">
            &larr; Back to Animals List
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Back Link */}
      <Link to="/animals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Animals List
      </Link>

      {/* Header Profile Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-2xl flex items-center justify-center shadow-inner">
            {animal.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{animal.name}</h1>
              <Badge variant="outline">{animal.species}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Breed: <span className="font-semibold text-foreground">{animal.breed || 'Unspecified'}</span> &bull; Sex:{' '}
              <span className="font-semibold text-foreground">{animal.sex}</span> &bull; Tag:{' '}
              <span className="font-mono text-foreground font-semibold">{animal.identificationNumber || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Link to={`/animals/${animal.id}/scans/new`}>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Camera className="h-4 w-4" /> Upload Scan
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => setIsHealthModalOpen(true)} className="gap-1.5">
            <FilePlus className="h-4 w-4 text-emerald-600" /> Log Checkup
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsVaccineModalOpen(true)} className="gap-1.5">
            <Syringe className="h-4 w-4 text-blue-600" /> Vaccine
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsMedModalOpen(true)} className="gap-1.5">
            <Pill className="h-4 w-4 text-purple-600" /> Medication
          </Button>
        </div>
      </div>

      {/* Longitudinal Statistics Summary */}
      {timelineStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border bg-card">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Scans</span>
            <p className="text-xl font-bold text-foreground mt-1">{timelineStats.totalScans}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Normal Scans</span>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{timelineStats.normalScans}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Mild Lesions</span>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{timelineStats.mildScans}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-50/40 dark:bg-red-950/20">
            <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300">Severe Lesions</span>
            <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{timelineStats.severeScans}</p>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="border-b border-border flex items-center gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'timeline'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4" /> Longitudinal Timeline
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`pb-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'scans'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera className="h-4 w-4" /> Scans ({animal.scans?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'records'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FilePlus className="h-4 w-4" /> Clinical Records ({animal.healthRecords?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('vaccines')}
          className={`pb-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'vaccines'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Syringe className="h-4 w-4" /> Vaccinations ({animal.vaccinations?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('meds')}
          className={`pb-3 flex items-center gap-1.5 transition-colors border-b-2 ${
            activeTab === 'meds'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Pill className="h-4 w-4" /> Medications ({animal.medications?.length || 0})
        </button>
      </div>

      {/* Tab 1: Longitudinal Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="text-center py-12 text-xs text-muted-foreground border border-dashed rounded-xl">
              No historical events recorded on this animal yet.
            </p>
          ) : (
            <div className="relative pl-6 border-l-2 border-border space-y-6">
              {timeline.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 border-background bg-emerald-600 flex items-center justify-center text-white" />

                  <Card className="hover:border-emerald-500/50 transition-colors">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                            {event.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">&bull; {formatDateTime(event.date)}</span>
                        </div>
                        {event.badge && (
                          <Badge
                            variant={
                              event.severity === 'NORMAL'
                                ? 'success'
                                : event.severity === 'MILD'
                                  ? 'warning'
                                  : event.severity === 'SEVERE'
                                    ? 'destructive'
                                    : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {event.badge}
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground mt-1">{event.title}</h4>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{event.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Scans */}
      {activeTab === 'scans' && (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(!animal.scans || animal.scans.length === 0) ? (
            <div className="col-span-full text-center py-12 border border-dashed rounded-xl">
              <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No lesion imaging scans uploaded yet.</p>
              <Link to={`/animals/${animal.id}/scans/new`}>
                <Button size="sm" variant="primary" className="mt-3">
                  Upload First Scan
                </Button>
              </Link>
            </div>
          ) : (
            animal.scans.map((scan) => (
              <Card key={scan.id} className="overflow-hidden">
                <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                  {scan.fileAssetId ? (
                    <img
                      src={`/api/v1/files/${scan.fileAssetId}`}
                      alt={scan.bodyPart || 'Lesion scan'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{scan.bodyPart || 'Skin Capture'}</span>
                    {scan.prediction?.predictedClass === 'NORMAL' && <Badge variant="success">NORMAL</Badge>}
                    {scan.prediction?.predictedClass === 'MILD' && <Badge variant="warning">MILD</Badge>}
                    {scan.prediction?.predictedClass === 'SEVERE' && <Badge variant="destructive">SEVERE</Badge>}
                    {scan.prediction?.status === 'MODEL_UNAVAILABLE' && <Badge variant="info">SCREENING OFFLINE</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Captured: {formatDate(scan.captureTimestamp)}
                  </p>
                  <Link to={`/scans/${scan.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View AI Analysis &rarr;
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Health Records */}
      {activeTab === 'records' && (
        <div className="space-y-3">
          {(!animal.healthRecords || animal.healthRecords.length === 0) ? (
            <p className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl">
              No clinical checkup records logged.
            </p>
          ) : (
            animal.healthRecords.map((hr) => (
              <Card key={hr.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {hr.recordType}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDate(hr.recordedAt)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">{hr.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{hr.description}</p>
                  {hr.diagnosis && (
                    <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                      <strong>Diagnosis:</strong> {hr.diagnosis}
                    </div>
                  )}
                  {hr.treatment && (
                    <div className="mt-1 p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200">
                      <strong>Treatment:</strong> {hr.treatment}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Vaccinations */}
      {activeTab === 'vaccines' && (
        <div className="space-y-3">
          {(!animal.vaccinations || animal.vaccinations.length === 0) ? (
            <p className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl">
              No vaccination records logged.
            </p>
          ) : (
            animal.vaccinations.map((vac) => (
              <Card key={vac.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{vac.vaccineName}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Administered: {formatDate(vac.administeredDate)} &bull; Dose: {vac.dose || 'Standard'}
                    </p>
                    {vac.notes && <p className="text-xs text-muted-foreground mt-1">{vac.notes}</p>}
                  </div>
                  {vac.nextDueDate && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Booster Due</span>
                      <span className="text-xs font-semibold text-emerald-600">{formatDate(vac.nextDueDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Medications */}
      {activeTab === 'meds' && (
        <div className="space-y-3">
          {(!animal.medications || animal.medications.length === 0) ? (
            <p className="text-center py-10 text-xs text-muted-foreground border border-dashed rounded-xl">
              No active or past medications prescribed.
            </p>
          ) : (
            animal.medications.map((med) => (
              <Card key={med.id}>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{med.name}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {med.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Dosage: {med.dosage} &bull; {med.frequency}
                    </p>
                    {med.instructions && <p className="text-xs text-muted-foreground mt-1">{med.instructions}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <span>Started: {formatDate(med.startDate)}</span>
                    {med.endDate && <span className="block">Until: {formatDate(med.endDate)}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Health Record Modal */}
      <Modal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        title="Log Clinical Checkup"
        description={`Record observations or veterinary findings for ${animal.name}`}
      >
        <form onSubmit={handleCreateHealthRecord} className="space-y-4">
          <Input
            label="Record Title"
            placeholder="e.g. Routine herd checkup or lesion discovery"
            value={recordTitle}
            onChange={(e) => setRecordTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Record Category
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={RecordType.GENERAL_CHECKUP}>General Checkup</option>
              <option value={RecordType.SKIN_LESION}>Skin Lesion / Dermatology</option>
              <option value={RecordType.INJURY}>Injury / Trauma</option>
              <option value={RecordType.FOLLOW_UP}>Follow-up</option>
              <option value={RecordType.LAB_WORK}>Lab Work / Pathology</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Clinical Description
            </label>
            <textarea
              rows={3}
              placeholder="Detailed physical exam findings, temperature, lesion locations..."
              value={recordDesc}
              onChange={(e) => setRecordDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <Input
            label="Provisional Diagnosis (Optional)"
            placeholder="e.g. Early suspected cutaneous eruption"
            value={recordDiagnosis}
            onChange={(e) => setRecordDiagnosis(e.target.value)}
          />

          <Input
            label="Treatment Administered (Optional)"
            placeholder="e.g. Paddock isolation, vector repellent"
            value={recordTreatment}
            onChange={(e) => setRecordTreatment(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsHealthModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Health Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vaccine Modal */}
      <Modal
        isOpen={isVaccineModalOpen}
        onClose={() => setIsVaccineModalOpen(false)}
        title="Record Vaccination"
        description={`Log vaccine administration for ${animal.name}`}
      >
        <form onSubmit={handleCreateVaccine} className="space-y-4">
          <Input
            label="Vaccine Name"
            placeholder="e.g. Lumpy Skin Disease Live Attenuated (Neethling)"
            value={vaccineName}
            onChange={(e) => setVaccineName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Administered"
              type="date"
              value={administeredDate}
              onChange={(e) => setAdministeredDate(e.target.value)}
              required
            />
            <Input
              label="Next Due Date"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </div>

          <Input
            label="Dose / Route"
            placeholder="e.g. 2.0 mL Subcutaneous"
            value={vaccineDose}
            onChange={(e) => setVaccineDose(e.target.value)}
          />

          <Input
            label="Notes / Serial #"
            placeholder="Lot #TX-99182"
            value={vaccineNotes}
            onChange={(e) => setVaccineNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsVaccineModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Vaccination
            </Button>
          </div>
        </form>
      </Modal>

      {/* Medication Modal */}
      <Modal
        isOpen={isMedModalOpen}
        onClose={() => setIsMedModalOpen(false)}
        title="Record Prescription / Medication"
        description={`Log medication administration for ${animal.name}`}
      >
        <form onSubmit={handleCreateMedication} className="space-y-4">
          <Input
            label="Medication Name"
            placeholder="e.g. Flunixin Meglumine"
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dosage"
              placeholder="e.g. 2.2 mg/kg"
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
              required
            />
            <Input
              label="Frequency"
              placeholder="e.g. Once daily IV for 3 days"
              value={medFrequency}
              onChange={(e) => setMedFrequency(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={medStartDate}
              onChange={(e) => setMedStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={medEndDate}
              onChange={(e) => setMedEndDate(e.target.value)}
            />
          </div>

          <Input
            label="Instructions / Milk Withholding"
            placeholder="Observe milk withholding period of 36 hours"
            value={medInstructions}
            onChange={(e) => setMedInstructions(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsMedModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Medication
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
