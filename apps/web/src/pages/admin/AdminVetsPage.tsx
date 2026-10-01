import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { VeterinarianProfile, VetVerificationStatus } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Stethoscope } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function AdminVetsPage() {
  const [vets, setVets] = useState<VeterinarianProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadVets = async () => {
    try {
      const res = await api.admin.listVets();
      setVets(res.veterinarians);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVets();
  }, []);

  const handleUpdateStatus = async (userId: string, status: VetVerificationStatus) => {
    try {
      await api.admin.verifyVet(userId, status);
      await loadVets();
    } catch (err: any) {
      alert(err.message || 'Failed to update verification status');
    }
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Veterinarian Board Verification</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review medical board licensing credentials and grant verified practitioner trust badges
        </p>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : vets.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">No veterinarians registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Practitioner Name</th>
                    <th className="p-4">License Number</th>
                    <th className="p-4">Specialization</th>
                    <th className="p-4">Clinic / Practice</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vets.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20">
                      <td className="p-4">
                        <span className="font-bold text-foreground block">
                          Dr. {v.user?.firstName} {v.user?.lastName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{v.user?.email}</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-foreground">{v.licenseNumber}</td>
                      <td className="p-4 text-muted-foreground">{v.specialization} ({v.experienceYears} yrs)</td>
                      <td className="p-4 text-muted-foreground">{v.clinicName || 'Independent'}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            v.verificationStatus === VetVerificationStatus.VERIFIED
                              ? 'success'
                              : v.verificationStatus === VetVerificationStatus.PENDING
                                ? 'warning'
                                : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {v.verificationStatus}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {v.verificationStatus !== VetVerificationStatus.VERIFIED && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateStatus(v.userId, VetVerificationStatus.VERIFIED)}
                            className="text-xs mr-2 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Verify
                          </Button>
                        )}
                        {v.verificationStatus !== VetVerificationStatus.REJECTED && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateStatus(v.userId, VetVerificationStatus.REJECTED)}
                            className="text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
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
