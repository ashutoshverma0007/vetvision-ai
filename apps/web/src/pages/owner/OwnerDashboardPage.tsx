import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Animal, Scan, Consultation } from '@vetvision/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Activity,
  PlusCircle,
  Camera,
  MessageSquareText,
  Calendar,
  Layers,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ status: string; aiService: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [animalsRes, scansRes, consultationsRes, healthRes] = await Promise.all([
          api.animals.list().catch(() => ({ animals: [] })),
          api.scans.listRecent().catch(() => ({ scans: [] })),
          api.consultations.list().catch(() => ({ consultations: [] })),
          api.system.health().catch(() => null)
        ]);

        setAnimals(animalsRes.animals);
        setRecentScans(scansRes.scans);
        setConsultations(consultationsRes.consultations);
        if (healthRes) {
          setSystemHealth(healthRes);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const activeConsultations = consultations.filter(
    (c) => c.status !== 'COMPLETED' && c.status !== 'CANCELLED'
  );

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Welcome Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Owner Dashboard &mdash; Livestock & Companion Animal Monitoring
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link to="/animals">
            <Button size="sm" variant="outline" className="gap-1.5">
              <PlusCircle className="h-4 w-4 text-emerald-600" /> Add Animal
            </Button>
          </Link>
          <Link to="/animals">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Camera className="h-4 w-4" /> Upload Scan
            </Button>
          </Link>
          <Link to="/consultations">
            <Button size="sm" variant="outline" className="gap-1.5">
              <MessageSquareText className="h-4 w-4 text-blue-600" /> Consult Vet
            </Button>
          </Link>
        </div>
      </div>

      {/* AI System Status Banner */}
      {systemHealth?.aiService !== 'HEALTHY' && (
        <Alert variant="info" className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
          <AlertTitle className="text-sm font-semibold">AI Microservice Notice</AlertTitle>
          <AlertDescription>
            The platform is running in <strong>Honest Fallback Mode</strong>. Non-AI clinical records, vaccination tracking, and veterinary consultations are fully operational.
            When image scans are submitted, unconfigured AI models report <code>MODEL_UNAVAILABLE</code> rather than fabricating fake predictions.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Animals</span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{animals.length}</p>
            <Link to="/animals" className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
              View all profiles &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Scans</span>
              <Camera className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{recentScans.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Cutaneous captures</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Consultations</span>
              <MessageSquareText className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{activeConsultations.length}</p>
            <Link to="/consultations" className="text-xs text-purple-600 hover:underline mt-2 inline-block">
              View discussions &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Engine</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-600 mt-2">Active</p>
            <p className="text-xs text-muted-foreground mt-2">PostgreSQL 3NF Data</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Animals & Recent Scans */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Animals Quick Access */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Your Animals</CardTitle>
              <Link to="/animals">
                <Button variant="ghost" size="sm" className="text-xs">
                  Manage All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {animals.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-xl">
                  <p className="text-sm text-muted-foreground">No animals registered yet.</p>
                  <Link to="/animals">
                    <Button size="sm" variant="primary" className="mt-3">
                      Register Your First Animal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {animals.slice(0, 4).map((animal) => (
                    <div key={animal.id} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center">
                          {animal.name.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/animals/${animal.id}`} className="font-semibold text-sm hover:underline text-foreground">
                            {animal.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {animal.species} &bull; {animal.breed || 'Unknown breed'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {animal.sex}
                        </Badge>
                        <Link to={`/animals/${animal.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs">
                            Profile &rarr;
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Scans Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Recent Diagnostic Scans</CardTitle>
            </CardHeader>
            <CardContent>
              {recentScans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No lesion scans recorded yet. Upload a scan from any animal profile.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {recentScans.slice(0, 5).map((scan) => (
                    <div key={scan.id} className="py-3 flex items-center justify-between">
                      <div>
                        <Link to={`/scans/${scan.id}`} className="text-sm font-semibold hover:underline text-foreground">
                          {scan.bodyPart || 'Skin Capture'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {scan.animal?.name || 'Animal'} &bull; {formatDate(scan.captureTimestamp)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {scan.prediction?.predictedClass === 'NORMAL' && <Badge variant="success">NORMAL</Badge>}
                        {scan.prediction?.predictedClass === 'MILD' && <Badge variant="warning">MILD</Badge>}
                        {scan.prediction?.predictedClass === 'SEVERE' && <Badge variant="destructive">SEVERE</Badge>}
                        {scan.prediction?.status === 'MODEL_UNAVAILABLE' && (
                          <Badge variant="info">SCREENING OFFLINE</Badge>
                        )}
                        {scan.prediction?.status === 'LOW_CONFIDENCE' && (
                          <Badge variant="warning">LOW CONFIDENCE</Badge>
                        )}
                        <Link to={`/scans/${scan.id}`}>
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Consultations & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Consultations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeConsultations.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">No active consultations in progress.</p>
                  <Link to="/consultations">
                    <Button variant="outline" size="sm" className="mt-3 text-xs">
                      Request Consultation
                    </Button>
                  </Link>
                </div>
              ) : (
                activeConsultations.map((con) => (
                  <div key={con.id} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="text-[10px]">
                        {con.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDate(con.createdAt)}</span>
                    </div>
                    <Link to={`/consultations/${con.id}`} className="font-semibold text-xs text-foreground hover:underline block mt-1">
                      {con.subject}
                    </Link>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{con.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Clinical Guidelines Card */}
          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-2">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Bovine Herd Biosecurity
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              Upon detecting circumscribed nodular eruptions, isolate affected cattle immediately into quarantine pens and initiate vector insect control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
