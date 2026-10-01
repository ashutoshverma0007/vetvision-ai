import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  ShieldCheck,
  Users,
  Stethoscope,
  Cpu,
  FileText,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react';

export function AdminDashboardPage() {
  const [usersCount, setUsersCount] = useState<number>(0);
  const [vetsCount, setVetsCount] = useState<number>(0);
  const [modelsCount, setModelsCount] = useState<number>(0);
  const [auditLogsCount, setAuditLogsCount] = useState<number>(0);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersRes, vetsRes, modelsRes, logsRes, healthRes] = await Promise.all([
          api.admin.listUsers(1, 1).catch(() => ({ total: 0 })),
          api.admin.listVets().catch(() => ({ veterinarians: [] })),
          api.admin.listModels().catch(() => ({ models: [] })),
          api.admin.listAuditLogs(1, 1).catch(() => ({ total: 0 })),
          api.system.health().catch(() => null)
        ]);

        setUsersCount(usersRes.total);
        setVetsCount(vetsRes.veterinarians.length);
        setModelsCount(modelsRes.models.length);
        setAuditLogsCount(logsRes.total);
        setSystemHealth(healthRes);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            System Administration Portal
          </h1>
          <Badge variant="default" className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            Admin Access
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform governance, veterinary credential verification, ML model registry, and audit trails
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{usersCount}</p>
            <Link to="/admin/users" className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
              Manage accounts &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Veterinarians
              </span>
              <Stethoscope className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{vetsCount}</p>
            <Link to="/admin/veterinarians" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              Review licensing &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Model Versions
              </span>
              <Cpu className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{modelsCount}</p>
            <Link to="/admin/models" className="text-xs text-purple-600 hover:underline mt-2 inline-block">
              Model registry &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audit Events
              </span>
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{auditLogsCount}</p>
            <Link to="/admin/audit-logs" className="text-xs text-amber-600 hover:underline mt-2 inline-block">
              Security trail &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Admin Modules Quick Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users" className="block">
          <Card className="hover:border-purple-500/50 hover:shadow-md transition-all h-full">
            <CardContent className="pt-6">
              <Users className="h-6 w-6 text-emerald-600 mb-2" />
              <h3 className="font-bold text-sm text-foreground">User Management</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Inspect registered owners, veterinarians, and administrators.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/veterinarians" className="block">
          <Card className="hover:border-purple-500/50 hover:shadow-md transition-all h-full">
            <CardContent className="pt-6">
              <Stethoscope className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-bold text-sm text-foreground">Vet Verification</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Approve or reject medical board license registrations.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/models" className="block">
          <Card className="hover:border-purple-500/50 hover:shadow-md transition-all h-full">
            <CardContent className="pt-6">
              <Cpu className="h-6 w-6 text-purple-600 mb-2" />
              <h3 className="font-bold text-sm text-foreground">AI Model Registry</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Manage PyTorch/ONNX versions, activation, and metrics.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/audit-logs" className="block">
          <Card className="hover:border-purple-500/50 hover:shadow-md transition-all h-full">
            <CardContent className="pt-6">
              <FileText className="h-6 w-6 text-amber-600 mb-2" />
              <h3 className="font-bold text-sm text-foreground">Security Audit Trail</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Inspect structured security logs and event histories.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
