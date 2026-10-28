import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Animal, AnimalSpecies, Scan, Consultation, PredictedClass } from '@vetvision/shared-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Camera,
  ArrowLeft,
  Loader2,
  Calendar,
  Tag,
  Shield,
  Clock,
  MoreVertical,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Stethoscope,
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../lib/utils';

const SPECIES_OPTIONS: { value: AnimalSpecies; label: string }[] = [
  { value: AnimalSpecies.CATTLE, label: 'Cattle (Bovine)' },
  { value: AnimalSpecies.DOG, label: 'Dog (Canine)' },
  { value: AnimalSpecies.CAT, label: 'Cat (Feline)' },
  { value: AnimalSpecies.HORSE, label: 'Horse (Equine)' },
  { value: AnimalSpecies.SHEEP, label: 'Sheep (Ovine)' },
  { value: AnimalSpecies.GOAT, label: 'Goat (Caprine)' },
  { value: AnimalSpecies.OTHER, label: 'Other Species' }
];

export function AnimalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // UI State
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSpecies, setEditSpecies] = useState<AnimalSpecies>(AnimalSpecies.CATTLE);
  const [editBreed, setEditBreed] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAnimalData = async () => {
    if (!id) return;
    try {
      const res = await api.animals.getById(id);
      setAnimal(res.animal);
      setEditName(res.animal.name);
      setEditSpecies(res.animal.species as AnimalSpecies);
      setEditBreed(res.animal.breed || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load animal profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnimalData();
  }, [id]);

  // Handle Edit Animal Submission
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editName.trim()) return;

    setActionError(null);
    setIsSavingEdit(true);

    try {
      // Preserve all other existing fields by only sending name, species, breed
      const updatedRes = await api.animals.update(id, {
        name: editName.trim(),
        species: editSpecies,
        breed: editBreed.trim() || undefined
      });

      setAnimal(updatedRes.animal);
      setIsEditModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update animal profile.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Animal Submission
  const handleDeleteAnimal = async () => {
    if (!id || !animal) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await api.animals.delete(id);
      setIsDeleteModalOpen(false);
      navigate('/animals', {
        state: { message: `Animal profile "${animal.name}" was deleted successfully.` },
        replace: true
      });
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete animal. Please try again.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-muted-foreground">Loading animal profile...</p>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="container py-20 max-w-lg text-center space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Profile Unavailable</AlertTitle>
          <AlertDescription>{error || 'The requested animal profile could not be found.'}</AlertDescription>
        </Alert>
        <Link to="/animals">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to My Animals
          </Button>
        </Link>
      </div>
    );
  }

  const speciesLabel =
    SPECIES_OPTIONS.find((s) => s.value === animal.species)?.label.split(' ')[0] || animal.species;

  // Filter and limit recent scans to a maximum of 3
  const recentScans: Scan[] = (animal.scans || []).slice(0, 3);
  const latestConsultation: Consultation | undefined = animal.consultations?.[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8 sm:py-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/animals"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to My Animals
          </Link>
        </div>

        {/* Global Action Error Banner */}
        {actionError && (
          <Alert variant="destructive" className="animate-in fade-in">
            <AlertTitle>Action Notice</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Header Profile Section */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/60 dark:to-teal-900/40 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-xs flex-shrink-0">
              {animal.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {animal.name}
                </h1>
                <Badge
                  variant="default"
                  className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                >
                  {speciesLabel}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                <span>{animal.breed || 'Breed Unspecified'}</span>
                {animal.identificationNumber && (
                  <>
                    <span className="text-muted-foreground/40">&bull;</span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground/80 bg-muted/60 px-2 py-0.5 rounded">
                      <Tag className="h-3 w-3 text-muted-foreground/70" />
                      {animal.identificationNumber}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditName(animal.name);
                setEditSpecies(animal.species as AnimalSpecies);
                setEditBreed(animal.breed || '');
                setIsEditModalOpen(true);
              }}
              className="gap-1.5 text-xs font-semibold hover:border-emerald-500/40"
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Profile
            </Button>

            {/* Overflow Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1 shadow-lg shadow-black/10 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to={`/animals/${animal.id}/scans/new`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Run Diagnostic Scan</span>
                  </Link>
                  <Link
                    to={`/consultations?animalId=${animal.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                    <span>Request Consultation</span>
                  </Link>
                  <div className="my-1 border-t border-border/60" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteError(null);
                      setIsDeleteModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Delete Animal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Balanced Two-Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Animal Overview Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <h2 className="text-base font-semibold text-foreground tracking-tight">
                  Animal Overview
                </h2>
                <span className="text-xs text-muted-foreground">
                  Registered {formatDate(animal.createdAt)}
                </span>
              </div>

              {/* Essential Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Animal Name</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{animal.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Animal Type</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{speciesLabel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Breed</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{animal.breed || 'Unspecified'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Identifier / RFID</span>
                  <p className="font-mono font-medium text-foreground text-xs mt-0.5">
                    {animal.identificationNumber || 'None recorded'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Total Diagnostic Scans</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {animal.scans?.length || 0} scan(s)
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Clinical Records</span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {(animal.healthRecords?.length || 0) + (animal.vaccinations?.length || 0)} event(s)
                  </p>
                </div>
              </div>

              {/* Notes / Clinical Observations Callout */}
              {animal.notes && (
                <div className="rounded-xl bg-muted/40 border border-border/50 p-4 text-xs">
                  <span className="font-semibold text-foreground block mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Initial Observations & Notes
                  </span>
                  <p className="text-foreground/80 leading-relaxed">{animal.notes}</p>
                </div>
              )}

              {/* Unobtrusive More Details Expansion */}
              {(animal.sex || animal.weight || animal.dateOfBirth || animal.color) && (
                <div className="pt-2 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <span>{showMoreDetails ? 'Hide Additional Details' : 'More Details'}</span>
                    {showMoreDetails ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {showMoreDetails && (
                    <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs animate-in fade-in duration-150">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Sex</span>
                        <p className="font-medium text-foreground mt-0.5">{animal.sex || 'Unknown'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Recorded Weight</span>
                        <p className="font-medium text-foreground mt-0.5">
                          {animal.weight ? `${animal.weight} kg` : 'Unspecified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Estimated DOB</span>
                        <p className="font-medium text-foreground mt-0.5">
                          {animal.dateOfBirth ? formatDate(animal.dateOfBirth) : 'Unspecified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Color / Markings</span>
                        <p className="font-medium text-foreground mt-0.5">{animal.color || 'Unspecified'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Recent Scans Section */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <h2 className="text-base font-semibold text-foreground tracking-tight">
                    Recent Diagnostic Scans
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  Showing {recentScans.length} of {animal.scans?.length || 0}
                </span>
              </div>

              {recentScans.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-border/60 rounded-xl bg-muted/20">
                  <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">No diagnostic scans yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                    Capture or upload a cutaneous image to run real-time AI screening for Lumpy Skin Disease.
                  </p>
                  <Link to={`/animals/${animal.id}/scans/new`}>
                    <Button size="sm" className="mt-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                      <Camera className="h-3.5 w-3.5" /> Start First AI Scan
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan) => {
                    const pred = scan.prediction;
                    let outcomeBadge = (
                      <Badge variant="outline" className="text-[10px]">
                        {scan.status}
                      </Badge>
                    );

                    if (pred?.status === 'AVAILABLE' && pred.predictedClass) {
                      if (pred.predictedClass === PredictedClass.SEVERE) {
                        outcomeBadge = (
                          <Badge variant="destructive" className="text-[10px]">
                            Severe Lesions ({(pred.confidence! * 100).toFixed(1)}%)
                          </Badge>
                        );
                      } else if (pred.predictedClass === PredictedClass.MILD) {
                        outcomeBadge = (
                          <Badge variant="warning" className="text-[10px]">
                            Mild Lesions ({(pred.confidence! * 100).toFixed(1)}%)
                          </Badge>
                        );
                      } else if (pred.predictedClass === PredictedClass.NORMAL) {
                        outcomeBadge = (
                          <Badge variant="success" className="text-[10px]">
                            Normal / Healthy
                          </Badge>
                        );
                      }
                    } else if (scan.status === 'REVIEW_REQUIRED' || pred?.status === 'LOW_CONFIDENCE') {
                      outcomeBadge = (
                        <Badge variant="warning" className="text-[10px]">
                          Review Required
                        </Badge>
                      );
                    }

                    return (
                      <div
                        key={scan.id}
                        className="p-3.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {scan.bodyPart || 'Cutaneous capture'}
                            </span>
                            {outcomeBadge}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDateTime(scan.captureTimestamp)}
                            {pred?.inferenceTimeMs && ` • Latency: ${pred.inferenceTimeMs.toFixed(0)}ms`}
                          </p>
                        </div>

                        <Link to={`/scans/${scan.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40"
                          >
                            <span>View Scan</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View All Scans Action */}
              {(animal.scans?.length || 0) > 3 && (
                <div className="pt-2 text-center">
                  <Link
                    to={`/scans?animalId=${animal.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View All {animal.scans?.length} Scans &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Column (1/3 width) */}
          <div className="space-y-6">
            {/* 1. Prominent New AI Scan Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/80 via-card to-emerald-100/30 dark:from-emerald-950/30 dark:via-card dark:to-emerald-900/20 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Run AI Diagnostic Scan</h3>
                  <p className="text-[11px] text-muted-foreground">Lumpy Skin Disease (LSD) Screening</p>
                </div>
              </div>

              <p className="text-xs text-foreground/80 leading-relaxed">
                Submit a cutaneous photo of {animal.name} to receive automated neural inference on lesion severity within milliseconds.
              </p>

              <Link to={`/animals/${animal.id}/scans/new`} className="block">
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold text-xs">
                  <Camera className="h-4 w-4" /> New AI Scan
                </Button>
              </Link>
            </div>

            {/* 2. Compact Quick Facts Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5 text-xs">
              <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                Registered Profile Info
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium text-foreground truncate max-w-[180px]">
                    {(animal as any).owner?.firstName
                      ? `${(animal as any).owner.firstName} ${(animal as any).owner.lastName || ''}`.trim()
                      : (animal.ownerId ? `ID: ${animal.ownerId.slice(0, 8)}...` : 'Registered Owner')}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Identification Tag</span>
                  <span className="font-mono text-foreground font-medium">
                    {animal.identificationNumber || 'Not assigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground">Species Category</span>
                  <span className="font-medium text-foreground">{speciesLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Latest Screening</span>
                  <span className="font-medium text-foreground">
                    {animal.scans?.[0] ? formatDate(animal.scans[0].captureTimestamp) : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Veterinary Review / Consultation Summary */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    Veterinary Review
                  </h3>
                </div>
              </div>

              {latestConsultation ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {latestConsultation.subject}
                      </span>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {latestConsultation.status}
                      </Badge>
                    </div>
                    {latestConsultation.veterinarian && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Attending: Dr. {((latestConsultation.veterinarian as any).firstName
                          ? `${(latestConsultation.veterinarian as any).firstName} ${(latestConsultation.veterinarian as any).lastName || ''}`
                          : (latestConsultation.veterinarian as any).user?.firstName
                          ? `${(latestConsultation.veterinarian as any).user.firstName} ${(latestConsultation.veterinarian as any).user.lastName || ''}`
                          : 'Veterinarian').trim()}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Requested {formatDate(latestConsultation.createdAt)}
                    </p>
                  </div>

                  <Link to={`/consultations/${latestConsultation.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                      Open Consultation Workspace
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground leading-relaxed">
                    No active veterinary consultations for {animal.name}. You can link any scan to a consultation request.
                  </p>
                  <Link to={`/consultations`} className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" /> Request Consultation
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simplified 3-Field Edit Animal Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Animal Profile"
          description="Update basic identification details. Existing medical records and history will be preserved."
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Field 1: Name */}
            <Input
              label="Animal Name"
              placeholder="e.g. Bella"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              autoFocus
            />

            {/* Field 2 & 3: Species & Breed */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Animal Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={editSpecies}
                  onChange={(e) => setEditSpecies(e.target.value as AnimalSpecies)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-xs"
                  required
                >
                  {SPECIES_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Breed */}
              <Input
                label="Breed"
                placeholder="e.g. Holstein Friesian (Optional)"
                value={editBreed}
                onChange={(e) => setEditBreed(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingEdit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Animal Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) setIsDeleteModalOpen(false);
          }}
          title="Delete Animal Profile"
          description="Please confirm deletion of this animal profile."
        >
          {deleteError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Deletion Failed</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-4 text-xs text-red-900 dark:text-red-200 space-y-2">
              <p className="font-semibold text-sm">
                Are you sure you want to delete <span className="underline">{animal.name}</span>?
              </p>
              <p className="leading-relaxed opacity-90">
                This action is irreversible. All associated diagnostic scans, AI prediction results, and clinical health history tied to this animal profile will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="md"
                isLoading={isDeleting}
                onClick={handleDeleteAnimal}
                className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
              >
                Delete Animal
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
