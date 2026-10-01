import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Microscope, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="container max-w-4xl py-12 md:py-20">
      <Badge variant="outline" className="mb-3">Scientific & Clinical Background</Badge>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        Lumpy Skin Disease (LSD) Research Focus
      </h1>
      <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
        VetVision AI was conceived to address the global veterinary challenge of rapid, reliable screening for Lumpy Skin Disease (LSD) in cattle populations, while providing comprehensive clinical health management for livestock herds and companion animals.
      </p>

      {/* Disease Etiology */}
      <div className="mt-10 space-y-8">
        <div className="p-6 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Microscope className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Disease Etiology & Impact</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lumpy Skin Disease is caused by the <em>Lumpy skin disease virus</em> (LSDV), a member of the genus <em>Capripoxvirus</em> within the family <em>Poxviridae</em>. It primarily affects cattle and water buffalo, causing substantial economic loss due to decreased milk production, emaciation, hide damage, abortions, and secondary bacterial infections.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Clinical Presentation
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Characterized by firm, circumscribed nodules (1-5 cm in diameter) involving both the dermis and epidermis, frequently accompanied by fever (40°C-41.5°C), lymphadenopathy, and edema of limbs and brisket.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 font-semibold text-foreground">
                <Cpu className="h-4 w-4 text-emerald-600" /> Computer Vision Objective
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our model pipeline evaluates cutaneous lesion characteristics to provide probability rankings across three clinically meaningful stages: <strong>NORMAL</strong> (no eruptive lesions), <strong>MILD</strong> (early circumscribed nodules), and <strong>SEVERE</strong> (diffuse necrotic lesions).
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scientific Rigor & Principles */}
        <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" /> Scientific Integrity Principles
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
            <li>
              <strong>No Fabricated Metrics:</strong> Models require clinically validated datasets before reporting accuracy or F1-scores. Benchmarks strictly reflect empirical execution.
            </li>
            <li>
              <strong>Screening, Not Diagnosis:</strong> Model inferences represent auxiliary decision support, empowering veterinarians and owners rather than replacing formal diagnosis.
            </li>
            <li>
              <strong>Edge Optimization:</strong> Architectures are benchmarked for latency and on-device quantization (ONNX) to support rural farm deployment with intermittent connectivity.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
