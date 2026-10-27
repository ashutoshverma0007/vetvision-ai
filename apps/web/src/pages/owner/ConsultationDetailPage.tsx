import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Consultation,
  ConsultationMessage,
  ClinicalNote,
  ConsultationStatus,
  UserRole,
  PredictedClass
} from '@vetvision/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  ArrowLeft,
  Send,
  Stethoscope,
  User,
  Camera,
  Layers,
  Clock,
  Loader2,
  FileCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  PlusCircle,
  Info
} from 'lucide-react';
import { formatDateTime, formatDate } from '../../lib/utils';

export function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Clinical Note Form Fields
  const [noteForm, setNoteForm] = useState({
    presentingConcern: '',
    historyObservations: '',
    examinationFindings: '',
    assessment: '',
    recommendations: '',
    followUpDate: '',
    followUpInstructions: '',
    isOwnerVisible: true
  });

  const loadConsultation = async () => {
    if (!id) return;
    try {
      const res = await api.consultations.getById(id);
      setConsultation(res.consultation);
      setMessages(res.consultation.messages || []);
      setClinicalNotes(res.consultation.clinicalNotes || []);
      if (res.consultation.scheduledAt) {
        setScheduledAtInput(
          new Date(res.consultation.scheduledAt).toISOString().slice(0, 16)
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load consultation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await api.consultations.sendMessage(id, newMessage.trim());
      setMessages((prev) => [...prev, res.message]);
      setNewMessage('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleTransitionStatus = async (
    targetStatus: ConsultationStatus,
    extra?: { declineReason?: string; scheduledAt?: Date | string }
  ) => {
    if (!id) return;
    setIsActionLoading(true);
    try {
      await api.consultations.updateStatus(id, targetStatus, extra);
      await loadConsultation();
    } catch (err: any) {
      alert(err.message || `Failed to transition consultation to ${targetStatus}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAtInput) return;
    setIsActionLoading(true);
    try {
      await handleTransitionStatus(ConsultationStatus.SCHEDULED, {
        scheduledAt: new Date(scheduledAtInput)
      });
      setIsScheduleModalOpen(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      await handleTransitionStatus(ConsultationStatus.CANCELLED, {
        declineReason: cancelReasonInput || 'Consultation cancelled/declined'
      });
      setIsCancelModalOpen(false);
      setCancelReasonInput('');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreateClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsActionLoading(true);
    try {
      await api.consultations.createClinicalNote(id, {
        presentingConcern: noteForm.presentingConcern,
        historyObservations: noteForm.historyObservations || null,
        examinationFindings: noteForm.examinationFindings,
        assessment: noteForm.assessment,
        recommendations: noteForm.recommendations,
        followUpDate: noteForm.followUpDate ? new Date(noteForm.followUpDate) : null,
        followUpInstructions: noteForm.followUpInstructions || null,
        isOwnerVisible: noteForm.isOwnerVisible
      });

      setIsNoteModalOpen(false);
      setNoteForm({
        presentingConcern: '',
        historyObservations: '',
        examinationFindings: '',
        assessment: '',
        recommendations: '',
        followUpDate: '',
        followUpInstructions: '',
        isOwnerVisible: true
      });
      await loadConsultation();
    } catch (err: any) {
      alert(err.message || 'Failed to record clinical note');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="container py-16 max-w-md text-center">
        <Alert variant="destructive">
          <AlertTitle>Consultation Access Error</AlertTitle>
          <AlertDescription>{error || 'Consultation record not found'}</AlertDescription>
        </Alert>
        <Link to="/consultations">
          <Button variant="outline" className="mt-4">
            &larr; Return to Consultations
          </Button>
        </Link>
      </div>
    );
  }

  const isVet = user?.role === UserRole.VETERINARIAN;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isOwner = user?.role === UserRole.OWNER;
  const isAssignedVet = isVet && consultation.veterinarianId === user?.id;

  const steps = [
    { key: ConsultationStatus.REQUESTED, label: 'Requested' },
    { key: ConsultationStatus.ACCEPTED, label: 'Accepted' },
    { key: ConsultationStatus.SCHEDULED, label: 'Scheduled' },
    { key: ConsultationStatus.IN_PROGRESS, label: 'In Progress' },
    { key: ConsultationStatus.COMPLETED, label: 'Completed' }
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === consultation.status);
  const isCancelled = consultation.status === ConsultationStatus.CANCELLED;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link
        to={isVet ? '/vet/consultations' : '/consultations'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Consultations List
      </Link>

      {/* Header & Status Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {consultation.subject}
              </h1>
              <Badge
                variant={
                  consultation.status === ConsultationStatus.COMPLETED
                    ? 'success'
                    : consultation.status === ConsultationStatus.IN_PROGRESS
                      ? 'warning'
                      : consultation.status === ConsultationStatus.CANCELLED
                        ? 'destructive'
                        : 'outline'
                }
                className="text-xs font-bold"
              >
                {consultation.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Patient: <strong className="text-foreground">{consultation.animal?.name}</strong> ({consultation.animal?.species}) &bull;{' '}
              Owner: <span className="text-foreground">{consultation.owner?.firstName} {consultation.owner?.lastName}</span> &bull;{' '}
              Requested: {formatDateTime(consultation.createdAt)}
            </p>
          </div>

          {/* Veterinarian / Admin Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {(isVet || isAdmin) && consultation.status === ConsultationStatus.REQUESTED && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                  onClick={() => handleTransitionStatus(ConsultationStatus.ACCEPTED)}
                  isLoading={isActionLoading}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Accept Case
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={isActionLoading}
                >
                  <XCircle className="h-3.5 w-3.5" /> Decline Request
                </Button>
              </>
            )}

            {(isAssignedVet || isAdmin) && consultation.status === ConsultationStatus.ACCEPTED && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => setIsScheduleModalOpen(true)}
                  disabled={isActionLoading}
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-600" /> Schedule Session
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-xs gap-1.5"
                  onClick={() => handleTransitionStatus(ConsultationStatus.IN_PROGRESS)}
                  isLoading={isActionLoading}
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Start Consultation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel
                </Button>
              </>
            )}

            {(isAssignedVet || isAdmin) && consultation.status === ConsultationStatus.SCHEDULED && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => setIsScheduleModalOpen(true)}
                  disabled={isActionLoading}
                >
                  <Calendar className="h-3.5 w-3.5" /> Reschedule
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-xs gap-1.5"
                  onClick={() => handleTransitionStatus(ConsultationStatus.IN_PROGRESS)}
                  isLoading={isActionLoading}
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Start Consultation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600"
                  onClick={() => setIsCancelModalOpen(true)}
                >
                  Cancel
                </Button>
              </>
            )}

            {(isAssignedVet || isAdmin) && consultation.status === ConsultationStatus.IN_PROGRESS && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                  onClick={() => {
                    setNoteForm({
                      presentingConcern: consultation.description || '',
                      historyObservations: '',
                      examinationFindings: '',
                      assessment: '',
                      recommendations: '',
                      followUpDate: '',
                      followUpInstructions: '',
                      isOwnerVisible: true
                    });
                    setIsNoteModalOpen(true);
                  }}
                  disabled={isActionLoading}
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add Clinical Note
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5"
                  onClick={() => {
                    if (clinicalNotes.length === 0) {
                      alert(
                        'Guardrail: Cannot mark consultation COMPLETED without required clinical documentation. Please author at least one clinical note first.'
                      );
                      return;
                    }
                    handleTransitionStatus(ConsultationStatus.COMPLETED);
                  }}
                  isLoading={isActionLoading}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete Consultation
                </Button>
              </>
            )}

            {/* Owner Cancel action */}
            {isOwner &&
              (consultation.status === ConsultationStatus.REQUESTED ||
                consultation.status === ConsultationStatus.ACCEPTED ||
                consultation.status === ConsultationStatus.SCHEDULED) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={isActionLoading}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Request
                </Button>
              )}
          </div>
        </div>

        {/* Lifecycle Stepper */}
        {isCancelled ? (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-50/50 dark:bg-red-950/20 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-red-800 dark:text-red-300">
              <XCircle className="h-4 w-4" />
              <span>Consultation Cancelled</span>
            </div>
            {consultation.declineReason && (
              <p className="text-muted-foreground">
                Reason: <span className="italic text-foreground">{consultation.declineReason}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {steps.map((st, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={st.key} className="space-y-1">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isPassed
                          ? isCurrent && st.key === ConsultationStatus.IN_PROGRESS
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                          : 'bg-muted'
                      }`}
                    />
                    <span
                      className={`text-[11px] block font-semibold ${
                        isCurrent
                          ? 'text-foreground font-bold'
                          : isPassed
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {consultation.scheduledAt && (
              <div className="mt-3 flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 border border-border">
                <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                  <Calendar className="h-3.5 w-3.5" />
                  Scheduled Appointment: {formatDateTime(consultation.scheduledAt)}
                </span>
                {consultation.veterinarian && (
                  <span className="text-muted-foreground">
                    Attending: Dr.{' '}
                    {(consultation.veterinarian as any).firstName ||
                      (consultation.veterinarian as any).user?.firstName ||
                      'Doctor'}{' '}
                    {(consultation.veterinarian as any).lastName ||
                      (consultation.veterinarian as any).user?.lastName ||
                      ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Left Chat / Right Attached Scan & Clinical Notes */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Messages Thread */}
        <div className="md:col-span-2 space-y-6">
          {/* Chat Container */}
          <Card className="flex flex-col h-[520px] border border-border">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Consultation Dialogue & Persistent Messaging</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {messages.length} messages
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial clinical problem description */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  Initial Consultation Request
                </span>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {consultation.description}
                </p>
              </div>

              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                const isDoctor = m.sender?.role === UserRole.VETERINARIAN;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      {isDoctor ? (
                        <span className="font-semibold text-blue-600 flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" /> Dr. {m.sender?.firstName} {m.sender?.lastName}
                        </span>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {m.sender?.firstName} {m.sender?.lastName}
                        </span>
                      )}
                      <span>&bull; {formatDateTime(m.createdAt)}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : isDoctor
                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-foreground rounded-tl-none'
                            : 'bg-card border border-border text-foreground rounded-tl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })}
            </CardContent>

            {/* Message Input Box */}
            <div className="p-3 border-t border-border bg-card">
              {consultation.status === ConsultationStatus.CANCELLED ? (
                <p className="text-xs text-center text-muted-foreground py-1">
                  Messaging disabled for cancelled consultation.
                </p>
              ) : (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type clinical inquiry, observation, or message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 h-10 px-3.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSending}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </div>
          </Card>

          {/* Structured Clinical Notes Section */}
          <Card className="border border-border">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span>Veterinary Clinical Notes & Medical Evaluation</span>
              </CardTitle>

              {(isAssignedVet || isAdmin) &&
                consultation.status !== ConsultationStatus.CANCELLED &&
                consultation.status !== ConsultationStatus.COMPLETED && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => {
                      setNoteForm({
                        presentingConcern: consultation.description || '',
                        historyObservations: '',
                        examinationFindings: '',
                        assessment: '',
                        recommendations: '',
                        followUpDate: '',
                        followUpInstructions: '',
                        isOwnerVisible: true
                      });
                      setIsNoteModalOpen(true);
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-600" /> Add Clinical Note
                  </Button>
                )}
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {clinicalNotes.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-xl bg-card space-y-2">
                  <Stethoscope className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs font-medium text-foreground">
                    No clinical documentation authored yet
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    {isVet
                      ? 'Author presenting concern, physical exam findings, diagnosis, and recommendations to complete this consultation.'
                      : 'The attending veterinarian will document official clinical findings, diagnosis, and prescription recommendations here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clinicalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl border border-border bg-muted/10 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-bold text-foreground">
                            Authored by Dr. {note.veterinarian?.firstName}{' '}
                            {note.veterinarian?.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            &bull; {formatDateTime(note.createdAt)}
                          </span>
                        </div>

                        <div>
                          {note.isOwnerVisible ? (
                            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 dark:text-emerald-300">
                              <Eye className="h-2.5 w-2.5" /> Shared with Owner
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 text-amber-700 dark:text-amber-300">
                              <EyeOff className="h-2.5 w-2.5" /> Internal Vet Only
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Presenting Concern
                          </span>
                          <p className="text-foreground font-medium mt-0.5">
                            {note.presentingConcern}
                          </p>
                        </div>

                        {note.historyObservations && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              History & Observations
                            </span>
                            <p className="text-foreground mt-0.5">
                              {note.historyObservations}
                            </p>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Physical Examination Findings
                          </span>
                          <p className="text-foreground mt-0.5 whitespace-pre-line">
                            {note.examinationFindings}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Clinical Assessment / Diagnosis
                          </span>
                          <p className="text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                            {note.assessment}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 text-xs space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Treatment Recommendations
                          </span>
                          <p className="text-foreground mt-0.5 leading-relaxed">
                            {note.recommendations}
                          </p>
                        </div>

                        {(note.followUpDate || note.followUpInstructions) && (
                          <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            {note.followUpInstructions && (
                              <span>
                                <strong>Follow-Up:</strong> {note.followUpInstructions}
                              </span>
                            )}
                            {note.followUpDate && (
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                Return Visit: {formatDate(note.followUpDate)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Linked Scan & Patient Info */}
        <div className="space-y-4">
          {/* Linked Scan Card */}
          {consultation.scan ? (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-600" /> Attached Diagnostic Scan
                  </span>
                  <Link
                    to={`/scans/${consultation.scan.id}`}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline"
                  >
                    View Full Scan &rarr;
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {consultation.scan.fileAsset?.id && (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted/40 aspect-video relative flex items-center justify-center">
                    <img
                      src={`/api/v1/files/${consultation.scan.fileAsset.id}/content`}
                      alt="Attached scan"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Body Part:</span>
                    <span className="font-semibold text-foreground">
                      {consultation.scan.bodyPart || 'Dermatological Region'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Captured:</span>
                    <span className="text-foreground">
                      {formatDateTime(consultation.scan.captureTimestamp)}
                    </span>
                  </div>

                  {consultation.scan.prediction && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          AI Screening Result
                        </span>
                        <Badge
                          variant={
                            consultation.scan.prediction.predictedClass === PredictedClass.NORMAL
                              ? 'success'
                              : consultation.scan.prediction.predictedClass === PredictedClass.MILD
                                ? 'warning'
                                : 'destructive'
                          }
                          className="text-[10px] font-bold"
                        >
                          {consultation.scan.prediction.predictedClass}
                        </Badge>
                      </div>

                      {consultation.scan.prediction.confidence && (
                        <div className="text-[11px] text-muted-foreground">
                          Statistical Confidence:{' '}
                          <strong className="text-foreground">
                            {(consultation.scan.prediction.confidence * 100).toFixed(1)}%
                          </strong>
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/60 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>Research ONNX EfficientNet-B0</span>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 text-[10px] text-amber-900 dark:text-amber-200 leading-tight flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      AI scan classification is an automated screening aid. Final medical diagnosis and treatment plans are established solely by the attending veterinarian.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border">
              <CardContent className="p-4 text-center text-xs text-muted-foreground">
                <Camera className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                <span>No specific scan linked. This is a general clinical consultation.</span>
              </CardContent>
            </Card>
          )}

          {/* Patient Card */}
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Patient Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-semibold text-foreground">{consultation.animal?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Species:</span>
                <span className="font-semibold text-foreground">{consultation.animal?.species}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Breed:</span>
                <span className="font-semibold text-foreground">
                  {consultation.animal?.breed || 'Unspecified'}
                </span>
              </div>

              <Link to={`/animals/${consultation.animalId}`} className="block pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Open Animal Health Record
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Consultation Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule Clinical Consultation"
        description="Select scheduled appointment date and time for this case"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Appointment Date & Time *
            </label>
            <input
              type="datetime-local"
              value={scheduledAtInput}
              onChange={(e) => setScheduledAtInput(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScheduleModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isActionLoading}>
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel / Decline Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={isVet ? 'Decline / Cancel Consultation' : 'Cancel Consultation Request'}
        description="Record reason for cancelling or declining this consultation"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Reason for Cancellation
            </label>
            <Input
              placeholder="e.g. Inappropriate case, symptoms resolved, or schedule conflict"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isActionLoading}
            >
              Back
            </Button>
            <Button type="submit" variant="destructive" isLoading={isActionLoading}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Structured Clinical Note Authoring Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Author Veterinary Clinical Note"
        description="Document clinical evaluation, findings, diagnosis, and treatment instructions"
      >
        <form onSubmit={handleCreateClinicalNote} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Presenting Concern *
            </label>
            <Input
              value={noteForm.presentingConcern}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, presentingConcern: e.target.value }))
              }
              placeholder="e.g. Suspected nodule on lateral neck"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              History & Observations (Optional)
            </label>
            <textarea
              rows={2}
              value={noteForm.historyObservations}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, historyObservations: e.target.value }))
              }
              placeholder="Lesion onset, itching intensity, previous therapies..."
              className="w-full px-3 py-1.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Physical Examination Findings *
            </label>
            <textarea
              rows={3}
              value={noteForm.examinationFindings}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, examinationFindings: e.target.value }))
              }
              placeholder="Circumscribed 2cm cutaneous nodule, firm consistency, mild erythema..."
              className="w-full px-3 py-1.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Clinical Assessment / Diagnosis *
            </label>
            <Input
              value={noteForm.assessment}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, assessment: e.target.value }))
              }
              placeholder="e.g. Presumptive Lumpy Skin Disease (Moderate severity)"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Treatment Recommendations *
            </label>
            <textarea
              rows={3}
              value={noteForm.recommendations}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, recommendations: e.target.value }))
              }
              placeholder="Topical antiseptic wash daily; supportive hydration; isolation protocol..."
              className="w-full px-3 py-1.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Follow-Up Return Date
              </label>
              <input
                type="date"
                value={noteForm.followUpDate}
                onChange={(e) =>
                  setNoteForm((prev) => ({ ...prev, followUpDate: e.target.value }))
                }
                className="w-full h-9 px-2.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Follow-Up Instructions
              </label>
              <Input
                value={noteForm.followUpInstructions}
                onChange={(e) =>
                  setNoteForm((prev) => ({ ...prev, followUpInstructions: e.target.value }))
                }
                placeholder="e.g. Return in 7 days if swelling persists"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isOwnerVisibleCheck"
              checked={noteForm.isOwnerVisible}
              onChange={(e) =>
                setNoteForm((prev) => ({ ...prev, isOwnerVisible: e.target.checked }))
              }
              className="rounded border-input text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isOwnerVisibleCheck" className="text-xs text-foreground font-medium">
              Share this clinical evaluation note with the animal owner
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNoteModalOpen(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isActionLoading}>
              Save Clinical Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
