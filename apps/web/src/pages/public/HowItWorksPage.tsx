import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { UserPlus, Camera, Cpu, MessageSquareText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function HowItWorksPage() {
  const steps = [
    {
      step: '01',
      title: 'Register Animal Profile',
      desc: 'Create individual digital medical records with species, breed, identification numbers (RFID/tag/microchip), and historical baseline data.',
      icon: <UserPlus className="h-6 w-6 text-emerald-600" />
    },
    {
      step: '02',
      title: 'Capture & Upload Lesion Image',
      desc: 'Photograph skin nodules or suspected lesions. The system validates file integrity, examines magic bytes, and secures the binary outside public web directories.',
      icon: <Camera className="h-6 w-6 text-blue-600" />
    },
    {
      step: '03',
      title: 'AI Screening & Confidence Grading',
      desc: 'The internal PyTorch/ONNX microservice executes inference, returning latency metrics and class probabilities (Normal, Mild, Severe). If confidence is low, it abstains from definitive assertion.',
      icon: <Cpu className="h-6 w-6 text-purple-600" />
    },
    {
      step: '04',
      title: 'Veterinary Review & Action Plan',
      desc: 'Seamlessly transition from screening results to veterinary consultation. Licensed practitioners review historical scans, exchange messages, and record clinical treatment plans.',
      icon: <MessageSquareText className="h-6 w-6 text-amber-600" />
    }
  ];

  return (
    <div className="container max-w-5xl py-12 md:py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <Badge variant="outline" className="mb-2">Clinical Lifecycle</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          How VetVision AI Works
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          A seamless, production-quality pipeline connecting on-field animal observations with artificial intelligence and veterinary medical expertise.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 relative">
        {steps.map((s, idx) => (
          <Card key={idx} className="relative overflow-hidden border border-border/80">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  {s.icon}
                </div>
                <span className="font-mono text-3xl font-extrabold text-muted-foreground/30">{s.step}</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link to="/register">
          <Button size="lg" className="gap-2">
            Get Started Now <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
