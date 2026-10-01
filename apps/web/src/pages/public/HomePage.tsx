import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  Microscope,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileText
} from 'lucide-react';

export function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-emerald-500/10 via-background to-background">
        <div className="container relative z-10 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Microscope className="h-3.5 w-3.5" />
            <span>AI-Assisted Bovine & Pet Health Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Clinical Veterinary Records & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              AI-Powered Lesion Screening
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            VetVision AI pairs electronic animal health records, vaccination schedules, and licensed veterinary consultations with computer vision screening for <strong>Lumpy Skin Disease (LSD)</strong>.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-emerald-600/25">
                Register Animal Profile <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Explore Clinical Workflow
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">3-Class</p>
              <p className="text-xs text-muted-foreground mt-0.5">Normal, Mild, Severe LSD severity grading</p>
            </div>
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm">
              <p className="text-2xl font-bold text-emerald-600">100%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Non-hallucinatory AI fallback contract</p>
            </div>
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm">
              <p className="text-2xl font-bold text-foreground">Longitudinal</p>
              <p className="text-xs text-muted-foreground mt-0.5">Chronological timeline tracking per animal</p>
            </div>
            <div className="p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm">
              <p className="text-2xl font-bold text-blue-600">Licensed</p>
              <p className="text-xs text-muted-foreground mt-0.5">Veterinary consultation & clinical notes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20 bg-muted/40 border-y border-border/60">
        <div className="container max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-2">Core Platform Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Everything Your Livestock & Companion Care Requires
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built from the ground up for livestock managers, pet owners, and board-certified veterinarians.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-4">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Diagnostic Imaging & AI</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Secure upload pipeline validating magic bytes, computing SHA-256 hashes, and executing inference with probability distributions across Normal, Mild, and Severe classes.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 mb-4">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Longitudinal Health Timeline</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Chronological records unifying skin nodule scans, routine checkups, vaccination boosters, and prescriptions over the animal's lifetime.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 mb-4">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Veterinary Consultation</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Bridge the gap between remote owners and accredited veterinary practitioners with structured requests, persistent messaging, and clinical treatment plans.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ethical Architecture Highlight */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card p-8 md:p-12 shadow-sm">
            <div className="max-w-3xl">
              <Badge variant="success" className="mb-3">Architectural Integrity</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                No Fake APIs. No Hallucinated Predictions.
              </h2>
              <p className="mt-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                Unlike frontend mockups that simulate machine learning with arbitrary timers and hardcoded numbers, VetVision AI runs a real decoupled Python FastAPI inference service. When model weights are absent or unconfigured, the system explicitly marks predictions as <code className="text-emerald-700 dark:text-emerald-400 font-mono text-xs bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded">MODEL_UNAVAILABLE</code> while keeping the entire electronic record and consultation platform fully operational.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Argon2id Password Hashing
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> HttpOnly Secure Sessions
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> PostgreSQL Prisma Relational Store
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Isolated Non-Web-Root Storage
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
