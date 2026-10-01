import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setIsLoading(true);
      try {
        const res = await api.admin.listUsers(page, 20);
        setUsers(res.users);
        setTotal(res.total);
      } finally {
        setIsLoading(false);
      }
    }
    loadUsers();
  }, [page]);

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform registered accounts ({total} total)</p>
        </div>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4">Activity Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="p-4 font-semibold text-foreground">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{u.email}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            u.role === 'ADMIN'
                              ? 'default'
                              : u.role === 'VETERINARIAN'
                                ? 'info'
                                : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="p-4 text-muted-foreground">
                        {u._count ? (
                          <span>
                            {u._count.animals || 0} animals &bull; {u._count.uploadedScans || 0} scans
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
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
