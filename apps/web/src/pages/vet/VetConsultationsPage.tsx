import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Consultation, ConsultationStatus } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Stethoscope, ArrowRight, Loader2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function VetConsultationsPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

  const filtered = consultations.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Veterinary Case Reviews
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clinical cases assigned to you or waiting in the general intake pool
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', ConsultationStatus.REQUESTED, ConsultationStatus.ACCEPTED, ConsultationStatus.IN_PROGRESS, ConsultationStatus.COMPLETED].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-16 text-center border border-dashed rounded-2xl bg-card">
          No consultations match status '{statusFilter}'.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((con) => (
            <Card key={con.id} className="hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                    <span className="text-xs text-muted-foreground">&bull; {formatDate(con.createdAt)}</span>
                  </div>

                  <Link to={`/consultations/${con.id}`} className="font-bold text-sm text-foreground hover:underline block">
                    {con.subject}
                  </Link>

                  <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">{con.description}</p>

                  <p className="text-xs text-muted-foreground pt-1">
                    Patient: <strong className="text-foreground">{con.animal?.name}</strong> ({con.animal?.species}) &bull;{' '}
                    Owner: <strong className="text-foreground">{con.owner?.firstName} {con.owner?.lastName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/consultations/${con.id}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1">
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
