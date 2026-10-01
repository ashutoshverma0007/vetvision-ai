import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Scan, PredictedClass, PredictionStatus } from '@vetvision/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Activity,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  MessageSquareText,
  Loader2
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';

export function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScan() {
      if (!id) return;
      try {
        const res = await api.scans.getById(id);
        setScan(res.scan);
      } catch (err: any) {
        setError(err.message || 'Failed to load scan');
      } finally {
        setIsLoading(false);
      }
    }
    loadScan();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="container py-16 max-w-md text-center">
        <Alert variant="destructive">
          <AlertTitle>Scan Error</AlertTitle>
          <AlertDescription>{error || 'Scan not found'}</AlertDescription>
        </Alert>
        <Link to="/animals">
          <Button variant="outline" className="mt-4">
            &larr; Back to Animals
          </Button>
        </Link>
      </div>
    );
  }

  const prediction = scan.prediction;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <Link
        to={`/animals/${scan.animalId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {scan.animal?.name || 'Animal'} Profile
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Scan Analysis: {scan.bodyPart || 'Skin Lesion'}
            </h1>
            <Badge variant="outline">{scan.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Animal: <span className="font-semibold text-foreground">{scan.animal?.name}</span> &bull; Captured:{' '}
            <span className="font-medium text-foreground">{formatDateTime(scan.captureTimestamp)}</span>
          </p>
        </div>

        <Link to={`/consultations`}>
          <Button variant="primary" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <MessageSquareText className="h-4 w-4" /> Request Veterinary Review
          </Button>
        </Link>
      </div>

      {/* Mandatory Clinical Safety Disclaimer Banner */}
      <Alert variant="warning" className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <AlertTitle className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
          AI-Assisted Screening Result &mdash; Not a Veterinary Diagnosis
        </AlertTitle>
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          This automated classification serves solely as preliminary clinical decision support. Confirm suspected
          bovine contagious dermatoses or lumpy skin disease through hands-on physical exam and laboratory PCR/serology.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Secure Image View */}
        <Card className="overflow-hidden border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Diagnostic Photograph</span>
              <span className="text-xs text-muted-foreground font-normal">
                {scan.fileAsset?.originalFilename}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="bg-black/90 min-h-[320px] flex items-center justify-center p-2">
              <img
                src={`/api/v1/files/${scan.fileAssetId}`}
                alt={scan.bodyPart || 'Lesion scan'}
                className="max-h-[460px] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-4 bg-muted/30 text-xs text-muted-foreground flex justify-between">
              <span>Format: {scan.fileAsset?.mimeType}</span>
              <span>Size: {((scan.fileAsset?.sizeBytes || 0) / 1024).toFixed(1)} KB</span>
            </div>
          </CardContent>
        </Card>

        {/* Right: AI Inference Verdict & Probabilities */}
        <div className="space-y-6">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>AI Screening Evaluation</span>
                {prediction?.status === PredictionStatus.AVAILABLE && (
                  <Badge
                    variant={
                      prediction.predictedClass === PredictedClass.NORMAL
                        ? 'success'
                        : prediction.predictedClass === PredictedClass.MILD
                          ? 'warning'
                          : 'destructive'
                    }
                    className="text-xs font-bold px-3 py-1"
                  >
                    {prediction.predictedClass}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* State 1: Model Unavailable */}
              {prediction?.status === PredictionStatus.MODEL_UNAVAILABLE && (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200 text-sm">
                    <Cpu className="h-4 w-4 text-blue-600" />
                    <span>Model Weights Not Configured</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The platform inference engine operates with genuine weights. Since no trained model weight
                    artifact is currently mounted in the environment, the system reports{' '}
                    <code className="text-blue-700 dark:text-blue-400 font-mono">MODEL_UNAVAILABLE</code> rather
                    than fabricating a prediction.
                  </p>
                  <p className="text-xs font-medium text-blue-950 dark:text-blue-100">
                    Use the "Request Veterinary Review" button to have a licensed practitioner examine this capture.
                  </p>
                </div>
              )}

              {/* State 2: Low Confidence Abstention */}
              {prediction?.status === PredictionStatus.LOW_CONFIDENCE && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Low Confidence Screening Abstention</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The model was unable to classify this image with sufficient statistical confidence (top class probability
                    beneath clinical threshold). Licensed veterinary review is recommended.
                  </p>
                </div>
              )}

              {/* State 3: Normal / Mild / Severe Available Prediction */}
              {prediction?.status === PredictionStatus.AVAILABLE && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Screening Confidence</span>
                      <span className="text-emerald-600">
                        {prediction.confidence ? (prediction.confidence * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${(prediction.confidence || 0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Class Probabilities Distribution */}
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Class Probabilities Distribution
                    </span>

                    {/* Normal */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Normal (No eruptive nodules)</span>
                        <span className="font-semibold text-foreground">
                          {prediction.normalProbability ? (prediction.normalProbability * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${(prediction.normalProbability || 0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Mild */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Mild (Localized circumscribed lesions)</span>
                        <span className="font-semibold text-foreground">
                          {prediction.mildProbability ? (prediction.mildProbability * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${(prediction.mildProbability || 0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Severe */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Severe (Diffuse eruptive cutaneous necrosis)</span>
                        <span className="font-semibold text-foreground">
                          {prediction.severeProbability ? (prediction.severeProbability * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${(prediction.severeProbability || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Metadata & Latency Benchmarks */}
              <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Model Version</span>
                  <span className="font-mono text-foreground font-semibold">
                    {prediction?.modelVersion?.version || prediction?.modelVersionId || 'lsd-resnet50-v1.0.0'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Inference Latency</span>
                  <span className="text-foreground font-semibold">
                    {prediction?.inferenceTimeMs ? `${prediction.inferenceTimeMs} ms` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Preprocessing</span>
                  <span className="text-foreground font-semibold">
                    v{prediction?.preprocessingVersion || '1.0.0'} (ImageNet NCHW)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Compute Device</span>
                  <span className="text-foreground font-semibold uppercase">{prediction?.deviceType || 'CPU'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
