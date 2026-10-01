import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Consultation, ConsultationMessage, UserRole } from '@vetvision/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
  FileCheck
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConsultation = async () => {
    if (!id) return;
    try {
      const res = await api.consultations.getById(id);
      setConsultation(res.consultation);
      setMessages(res.consultation.messages || []);
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
          <AlertTitle>Consultation Error</AlertTitle>
          <AlertDescription>{error || 'Consultation not found'}</AlertDescription>
        </Alert>
        <Link to="/consultations">
          <Button variant="outline" className="mt-4">
            &larr; Back to Consultations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link
        to={user?.role === UserRole.VETERINARIAN ? '/vet/consultations' : '/consultations'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Consultations List
      </Link>

      {/* Header */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {consultation.subject}
            </h1>
            <Badge variant="outline">{consultation.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Patient: <span className="font-semibold text-foreground">{consultation.animal?.name}</span> ({consultation.animal?.species}) &bull;{' '}
            Owner: <span className="font-medium text-foreground">{consultation.owner?.firstName} {consultation.owner?.lastName}</span> &bull;{' '}
            Created: {formatDateTime(consultation.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Chat / Dialogue Thread */}
        <div className="md:col-span-2 space-y-4">
          <Card className="flex flex-col h-[600px] border border-border">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Clinical Discussion Dialogue</span>
                <span className="text-xs font-normal text-muted-foreground">({messages.length} messages)</span>
              </CardTitle>
            </CardHeader>

            {/* Scrollable Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial consultation problem description */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  Initial Clinical Complaint / Request
                </span>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{consultation.description}</p>
              </div>

              {messages.map((m) => {
                const isMe = m.senderId === user?.id;
                const isVet = m.sender?.role === UserRole.VETERINARIAN;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      {isVet ? (
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
                          : isVet
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
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a clinical reply or inquiry..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button type="submit" variant="primary" size="sm" isLoading={isSending} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right: Patient Animal Snapshot & Scans */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Patient Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Animal Name:</span>
                <span className="font-semibold text-foreground">{consultation.animal?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Species:</span>
                <span className="font-semibold text-foreground">{consultation.animal?.species}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Breed:</span>
                <span className="font-semibold text-foreground">{consultation.animal?.breed || 'Unspecified'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Identification Tag:</span>
                <span className="font-mono font-semibold text-foreground">{consultation.animal?.identificationNumber || 'None'}</span>
              </div>

              <Link to={`/animals/${consultation.animalId}`} className="block pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> View Longitudinal Timeline
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Scans Attached to Animal */}
          {consultation.animal?.scans && consultation.animal.scans.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Recent Diagnostic Scans</span>
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {consultation.animal.scans.map((s) => (
                  <Link
                    key={s.id}
                    to={`/scans/${s.id}`}
                    className="p-2.5 rounded-lg border border-border hover:bg-muted/30 flex items-center justify-between transition-colors block"
                  >
                    <div>
                      <p className="font-semibold text-xs text-foreground">{s.bodyPart || 'Skin Scan'}</p>
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(s.captureTimestamp)}</span>
                    </div>
                    {s.prediction?.predictedClass && (
                      <Badge variant="outline" className="text-[10px]">
                        {s.prediction.predictedClass}
                      </Badge>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
