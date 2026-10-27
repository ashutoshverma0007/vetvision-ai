import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Consultation, ConsultationStatus } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Stethoscope,
  ArrowRight,
  Loader2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Inbox,
  Briefcase
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../lib/utils';

export function VetConsultationsPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<'INTAKE' | 'ASSIGNED' | 'COMPLETED' | 'ALL'>('INTAKE');
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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

  const handleQuickAccept = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActionId(id);
    try {
      await api.consultations.updateStatus(id, ConsultationStatus.ACCEPTED);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept consultation');
    } finally {
      setActionId(null);
    }
  };

  const intakeQueue = consultations.filter(
    (c) => c.status === ConsultationStatus.REQUESTED
  );
  const myAssigned = consultations.filter(
    (c) =>
      c.veterinarianId === user?.id &&
      (c.status === ConsultationStatus.ACCEPTED ||
        c.status === ConsultationStatus.SCHEDULED ||
        c.status === ConsultationStatus.IN_PROGRESS)
  );
  const completed = consultations.filter(
    (c) => c.status === ConsultationStatus.COMPLETED
  );

  const displayedConsultations =
    activeTab === 'INTAKE'
      ? intakeQueue
      : activeTab === 'ASSIGNED'
        ? myAssigned
        : activeTab === 'COMPLETED'
          ? completed
          : consultations;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Veterinary Case Reviews
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clinical triage queue, active patient consultations, and finalized medical records
          </p>
        </div>

        {/* Tab Badges */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('INTAKE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'INTAKE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            Intake Queue ({intakeQueue.length})
          </button>

          <button
            onClick={() => setActiveTab('ASSIGNED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ASSIGNED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            My Active Cases ({myAssigned.length})
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'COMPLETED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed ({completed.length})
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            All Cases ({consultations.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : displayedConsultations.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-card space-y-2">
          <Stethoscope className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">
            No consultations currently in this tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedConsultations.map((con) => (
            <Card key={con.id} className="hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      <Badge variant="outline" className="text-[10px] gap-1 text-blue-600">
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
                    className="font-bold text-sm text-foreground hover:underline block"
                  >
                    {con.subject}
                  </Link>

                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                    {con.description}
                  </p>

                  <p className="text-xs text-muted-foreground pt-0.5">
                    Patient: <strong className="text-foreground">{con.animal?.name}</strong> (
                    {con.animal?.species} - {con.animal?.breed || 'Unknown breed'}) &bull; Owner:{' '}
                    <strong className="text-foreground">
                      {con.owner?.firstName} {con.owner?.lastName}
                    </strong>
                    {con.owner?.phone && <span> ({con.owner.phone})</span>}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {con.status === ConsultationStatus.REQUESTED && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1"
                      onClick={(e) => handleQuickAccept(con.id, e)}
                      isLoading={actionId === con.id}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Accept Case
                    </Button>
                  )}

                  <Link to={`/consultations/${con.id}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1 whitespace-nowrap">
                      Clinical Workspace <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
