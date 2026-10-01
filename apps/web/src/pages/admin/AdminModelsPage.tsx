import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ModelVersion, ModelStatus, ModelFramework } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Loader2, Cpu, PlusCircle, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function AdminModelsPage() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [framework, setFramework] = useState<ModelFramework>(ModelFramework.PYTORCH);
  const [artifactUri, setArtifactUri] = useState('models/lsd_resnet50_v1.0.0.pt');
  const [validationDataset, setValidationDataset] = useState('BovineDerm-LSD-Val-2024');
  const [accuracy, setAccuracy] = useState('0.912');
  const [f1Score, setF1Score] = useState('0.909');
  const [notes, setNotes] = useState('');

  const loadModels = async () => {
    try {
      const res = await api.admin.listModels();
      setModels(res.models);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleActivate = async (modelId: string) => {
    try {
      await api.admin.setModelStatus(modelId, ModelStatus.ACTIVE);
      await loadModels();
    } catch (err: any) {
      alert(err.message || 'Failed to activate model');
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.admin.createModel({
        name,
        version,
        framework,
        artifactUri,
        validationDataset,
        accuracy: parseFloat(accuracy) || undefined,
        f1Score: parseFloat(f1Score) || undefined,
        notes: notes || undefined,
        status: ModelStatus.CANDIDATE
      });
      setIsModalOpen(false);
      await loadModels();
    } catch (err: any) {
      alert(err.message || 'Failed to register model');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Admin Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Model Registry & Version Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            PyTorch and ONNX inference artifacts, validation metrics, and active runtime assignments
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <PlusCircle className="h-4 w-4" /> Register Model Version
        </Button>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : models.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">No model versions registered in database.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-4">Model & Version</th>
                    <th className="p-4">Framework</th>
                    <th className="p-4">Artifact URI</th>
                    <th className="p-4">Validation Dataset</th>
                    <th className="p-4">Metrics (Acc / F1)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="p-4">
                        <span className="font-bold text-foreground block">{m.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{m.version}</span>
                      </td>
                      <td className="p-4 font-semibold text-foreground">{m.framework}</td>
                      <td className="p-4 font-mono text-[11px] text-muted-foreground">{m.artifactUri}</td>
                      <td className="p-4 text-muted-foreground">{m.validationDataset || 'N/A'}</td>
                      <td className="p-4 text-muted-foreground">
                        {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : 'N/A'} /{' '}
                        {m.f1Score ? `${(m.f1Score * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            m.status === ModelStatus.ACTIVE
                              ? 'success'
                              : m.status === ModelStatus.CANDIDATE
                                ? 'warning'
                                : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {m.status !== ModelStatus.ACTIVE && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleActivate(m.id)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
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

      {/* Register Model Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register AI Model Version"
        description="Catalog a trained PyTorch or ONNX model artifact and validation metrics"
      >
        <form onSubmit={handleCreateModel} className="space-y-4">
          <Input
            label="Model Display Name"
            placeholder="e.g. Lumpy Skin Disease EfficientNet-B4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Version Tag"
              placeholder="lsd-efficientnet-v2.0.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Framework
              </label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value as ModelFramework)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={ModelFramework.PYTORCH}>PyTorch (.pt / .pth)</option>
                <option value={ModelFramework.ONNX}>ONNX Runtime (.onnx)</option>
              </select>
            </div>
          </div>

          <Input
            label="Artifact URI / Filesystem Path"
            placeholder="models/weights/lsd_model.onnx"
            value={artifactUri}
            onChange={(e) => setArtifactUri(e.target.value)}
            required
          />

          <Input
            label="Validation Dataset Identifier"
            placeholder="e.g. BovineDerm-Val-2024 (n=1200)"
            value={validationDataset}
            onChange={(e) => setValidationDataset(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Validation Accuracy (0.0 - 1.0)"
              placeholder="0.912"
              value={accuracy}
              onChange={(e) => setAccuracy(e.target.value)}
            />
            <Input
              label="Macro F1-Score (0.0 - 1.0)"
              placeholder="0.909"
              value={f1Score}
              onChange={(e) => setF1Score(e.target.value)}
            />
          </div>

          <Input
            label="Architectural Notes"
            placeholder="Quantized INT8 model for low-latency edge deployment"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              Register Model
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
