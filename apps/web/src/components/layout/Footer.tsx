import React from 'react';
import { Activity, ShieldAlert } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 text-muted-foreground mt-auto">
      {/* Medical / Legal Clinical Disclaimer Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 py-3 px-4">
        <div className="container flex items-center justify-center gap-2 text-center text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Clinical Safety Disclaimer:</strong> VetVision AI provides AI-assisted screening decision support.
            It does not constitute definitive veterinary diagnosis or substitute for hands-on clinical examination by a licensed veterinarian.
          </span>
        </div>
      </div>

      <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          <span className="font-semibold text-foreground">VetVision AI</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="/about" className="hover:text-foreground transition-colors">
            Research Protocol
          </a>
          <a href="/how-it-works" className="hover:text-foreground transition-colors">
            Screening Guidelines
          </a>
          <span className="text-muted-foreground/60">Strictly Non-Hallucinatory Architecture</span>
        </div>
      </div>
    </footer>
  );
}
