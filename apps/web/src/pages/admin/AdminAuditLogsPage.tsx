import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { AuditLog } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Loader2, FileText, Shield } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const res = await api.admin.listAuditLogs(page, 50);
        setLogs(res.logs);
        setTotal(res.total);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, [page]);

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security Audit Trail</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable chronological ledger of security events, authentications, uploads, and data mutations ({total} events)
        </p>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">No audit logs recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Action Event</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Resource</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-[11px]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="p-4 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                      <td className="p-4 font-bold text-foreground">
                        <span className="font-sans px-2 py-0.5 rounded bg-muted text-xs">{log.action}</span>
                      </td>
                      <td className="p-4 text-muted-foreground font-sans">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.role})` : 'System / Anonymous'}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {log.resourceType} {log.resourceId ? `#${log.resourceId.slice(0, 8)}...` : ''}
                      </td>
                      <td className="p-4 text-muted-foreground">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
