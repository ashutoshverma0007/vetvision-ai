import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { Animal, AnimalSpecies, AnimalSex } from '@vetvision/shared-types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import {
  Plus,
  Search,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Tag,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

const SPECIES_OPTIONS: { value: AnimalSpecies; label: string }[] = [
  { value: AnimalSpecies.CATTLE, label: 'Cattle (Bovine)' },
  { value: AnimalSpecies.DOG, label: 'Dog (Canine)' },
  { value: AnimalSpecies.CAT, label: 'Cat (Feline)' },
  { value: AnimalSpecies.HORSE, label: 'Horse (Equine)' },
  { value: AnimalSpecies.SHEEP, label: 'Sheep (Ovine)' },
  { value: AnimalSpecies.GOAT, label: 'Goat (Caprine)' },
  { value: AnimalSpecies.OTHER, label: 'Other Species' }
];

export function AnimalsListPage() {
  const location = useLocation();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('ALL');
  const [successBanner, setSuccessBanner] = useState<string | null>(
    (location.state as any)?.message || null
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Simplified 3-field Form State
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<AnimalSpecies>(AnimalSpecies.CATTLE);
  const [breed, setBreed] = useState('');

  const loadAnimals = async () => {
    try {
      const res = await api.animals.list();
      setAnimals(res.animals);
    } catch {
      // Handled via state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  const handleCreateAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError('Animal name is required.');
      return;
    }

    setModalError(null);
    setIsSubmitting(true);

    try {
      await api.animals.create({
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        sex: AnimalSex.UNKNOWN // Safe default required by backend schema
      });

      setIsModalOpen(false);
      setName('');
      setSpecies(AnimalSpecies.CATTLE);
      setBreed('');
      setSuccessBanner('Animal profile created successfully.');
      await loadAnimals();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create animal profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAnimals = animals.filter((animal) => {
    const matchesSearch =
      animal.name.toLowerCase().includes(search.toLowerCase()) ||
      (animal.breed && animal.breed.toLowerCase().includes(search.toLowerCase())) ||
      (animal.identificationNumber && animal.identificationNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesSpecies = speciesFilter === 'ALL' || animal.species === speciesFilter;
    return matchesSearch && matchesSpecies;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8 sm:py-10 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/40">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              My Animals
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your animals and view their health screening history.
            </p>
          </div>

          <Button
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-150 self-start sm:self-auto px-4 py-2"
          >
            <Plus className="h-4 w-4" /> Add Animal
          </Button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter and Search Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search by name, breed, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
            />
          </div>

          {/* Species Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSpeciesFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                speciesFilter === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-card border border-border/80 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              All ({animals.length})
            </button>
            {SPECIES_OPTIONS.map((opt) => {
              const count = animals.filter((a) => a.species === opt.value).length;
              if (count === 0 && speciesFilter !== opt.value) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSpeciesFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    speciesFilter === opt.value
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-card border border-border/80 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {opt.label.split(' ')[0]} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Animal Cards Grid */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-muted-foreground">Loading your animal profiles...</p>
          </div>
        ) : filteredAnimals.length === 0 ? (
          <div className="text-center py-20 px-4 border border-dashed border-border/80 rounded-2xl bg-card/60 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search || speciesFilter !== 'ALL' ? 'No animals match your criteria' : 'No animals registered yet'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
              {search || speciesFilter !== 'ALL'
                ? 'Try adjusting your search terms or reset the species filter.'
                : 'Get started by adding your first animal profile to begin tracking health and running AI scans.'}
            </p>
            {search || speciesFilter !== 'ALL' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSpeciesFilter('ALL');
                }}
                className="mt-5 text-xs"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                <Plus className="h-4 w-4" /> Add Your First Animal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnimals.map((animal) => {
              const speciesLabel =
                SPECIES_OPTIONS.find((s) => s.value === animal.species)?.label.split(' ')[0] || animal.species;

              return (
                <div
                  key={animal.id}
                  className="group rounded-2xl border border-border/90 bg-card p-5 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Name, Breed, Species */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/60 dark:to-teal-900/40 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
                          {animal.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base text-foreground tracking-tight group-hover:text-emerald-600 transition-colors truncate">
                            {animal.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {animal.breed || 'Breed Unspecified'}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="default"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex-shrink-0"
                      >
                        {speciesLabel}
                      </Badge>
                    </div>

                    {/* Metadata Pill */}
                    <div className="mt-4 pt-3.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                        <Tag className="h-3 w-3 text-muted-foreground/70 flex-shrink-0" />
                        <span className="truncate">{animal.identificationNumber || 'No ID Tag'}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {(animal as any)._count?.scans != null
                          ? `${(animal as any)._count.scans} scan(s)`
                          : (animal.scans?.length != null ? `${animal.scans.length} scan(s)` : '0 scans')}
                      </span>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-5 pt-3 border-t border-border/40">
                    <Link to={`/animals/${animal.id}`} className="block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-between hover:bg-emerald-50/60 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-xs font-semibold transition-colors"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Simplified 3-Field Add Animal Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Animal"
          description="Enter the basic information to register a new animal in your health monitoring system."
        >
          {modalError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{modalError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateAnimal} className="space-y-4">
            {/* Field 1: Animal Name (Required) */}
            <Input
              label="Animal Name"
              placeholder="e.g. Bella"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            {/* Field 2 & 3: Animal Type and Breed */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Animal Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as AnimalSpecies)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-xs"
                  required
                >
                  {SPECIES_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 3: Breed (Optional) */}
              <Input
                label="Breed"
                placeholder="e.g. Holstein Friesian (Optional)"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
              >
                Save Animal
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
