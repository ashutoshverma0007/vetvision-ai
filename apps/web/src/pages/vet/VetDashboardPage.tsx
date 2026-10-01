import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Consultation, ConsultationStatus, VetVerificationStatus } from '@vetvision/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Stethoscope,
  ShieldCheck,
  Clock,
  MessageSquareText,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function VetDashboardPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.consultations.list();
      setConsultations(res.consultations);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcceptConsultation = async (consultationId: string) => {
    try {
      await api.consultations.updateStatus(consultationId, ConsultationStatus.ACCEPTED);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept consultation');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const assigned = consultations.filter((c) => c.veterinarianId === user?.id);
  const pendingRequests = consultations.filter(
    (c) => c.status === ConsultationStatus.REQUESTED && !c.veterinarianId
  );
  const inProgress = assigned.filter((c) => c.status === ConsultationStatus.IN_PROGRESS || c.status === ConsultationStatus.ACCEPTED);

  const isVerified = user?.veterinarianProfile?.verificationStatus === VetVerificationStatus.VERIFIED;

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Dr. {user?.firstName} {user?.lastName}
            </h1>
            {isVerified ? (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Board Verified
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Clock className="h-3.5 w-3.5" /> License Verification Pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clinical Practice Portal &bull; {user?.veterinarianProfile?.specialization || 'Large Animal Medicine'} &bull; License:{' '}
            <span className="font-mono">{user?.veterinarianProfile?.licenseNumber || 'N/A'}</span>
          </p>
        </div>

        <Link to="/vet/profile">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Stethoscope className="h-4 w-4 text-blue-600" /> Edit Credentials
          </Button>
        </Link>
      </div>

      {!isVerified && (
        <Alert variant="warning">
          <AlertTitle className="text-xs font-bold uppercase">Credentialing Review in Progress</AlertTitle>
          <AlertDescription className="text-xs">
            Your veterinary board license number ({user?.veterinarianProfile?.licenseNumber}) is currently queued for
            administrative verification. You can review and preview assigned patient cases in the interim.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Acceptance
            </span>
            <p className="text-3xl font-bold text-amber-600 mt-2">{pendingRequests.length}</p>
            <p className="text-xs text-muted-foreground mt-2">New patient requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In-Progress Reviews
            </span>
            <p className="text-3xl font-bold text-blue-600 mt-2">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Active cases under review</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Assigned
            </span>
            <p className="text-3xl font-bold text-foreground mt-2">{assigned.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Lifetime consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clinical Specialization
            </span>
            <p className="text-sm font-bold text-foreground mt-2 truncate">
              {user?.veterinarianProfile?.specialization || 'Bovine Medicine'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {user?.veterinarianProfile?.experienceYears || 0} years clinical exp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Available Consultation Requests Awaiting Pickup */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center justify-between">
          <span>Incoming Requests Awaiting Veterinary Pickup</span>
          <Badge variant="outline">{pendingRequests.length} Available</Badge>
        </h2>

        {pendingRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center border border-dashed rounded-xl bg-card">
            No unassigned consultation requests waiting in the queue.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <Card key={req.id} className="border border-border hover:border-blue-500/40 transition-colors">
                <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="text-[10px]">
                        NEW REQUEST
                      </Badge>
                      <span className="text-xs text-muted-foreground">&bull; Submitted {formatDate(req.createdAt)}</span>
                    </div>

                    <h4 className="font-bold text-sm text-foreground">{req.subject}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">{req.description}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>
                        Patient: <strong>{req.animal?.name}</strong> ({req.animal?.species} &bull; {req.animal?.breed || 'Unknown breed'})
                      </span>
                      <span>
                        Owner: <strong>{req.owner?.firstName} {req.owner?.lastName}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to={`/consultations/${req.id}`}>
                      <Button variant="outline" size="sm" className="text-xs">
                        Inspect Case
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleAcceptConsultation(req.id)}
                    >
                      Accept Patient Case
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* In-Progress Assigned Consultations */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-foreground">Your Active Consultations</h2>

        {assigned.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center border border-dashed rounded-xl bg-card">
            You have no consultations assigned to you yet. Accept a case from the queue above.
          </p>
        ) : (
          <div className="space-y-3">
            {assigned.map((con) => (
              <Card key={con.id} className="hover:border-emerald-500/40 transition-colors">
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={con.status === 'COMPLETED' ? 'success' : 'default'}
                        className="text-[10px]"
                      >
                        {con.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">&bull; {formatDate(con.createdAt)}</span>
                    </div>

                    <Link to={`/consultations/${con.id}`} className="font-bold text-sm text-foreground hover:underline block mt-1">
                      {con.subject}
                    </Link>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      Patient: {con.animal?.name} ({con.animal?.species}) &bull; Owner: {con.owner?.firstName} {con.owner?.lastName}
                    </p>
                  </div>

                  <Link to={`/consultations/${con.id}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1">
                      Review Case & Notes <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
