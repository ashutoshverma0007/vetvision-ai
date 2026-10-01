import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Animal, AnimalSpecies, AnimalSex } from '@vetvision/shared-types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { PlusCircle, Search, Layers, Loader2, ArrowRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export function AnimalsListPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<AnimalSpecies>(AnimalSpecies.CATTLE);
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<AnimalSex>(AnimalSex.UNKNOWN);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [weight, setWeight] = useState('');
  const [color, setColor] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [notes, setNotes] = useState('');

  const loadAnimals = async () => {
    try {
      const res = await api.animals.list();
      setAnimals(res.animals);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  const handleCreateAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      await api.animals.create({
        name,
        species,
        breed: breed || undefined,
        sex,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        color: color || undefined,
        identificationNumber: identificationNumber || undefined,
        notes: notes || undefined
      });

      setIsModalOpen(false);
      // Reset form
      setName('');
      setBreed('');
      setWeight('');
      setColor('');
      setIdentificationNumber('');
      setNotes('');
      // Reload list
      await loadAnimals();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create animal profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = animals.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.identificationNumber && a.identificationNumber.toLowerCase().includes(search.toLowerCase())) ||
      (a.breed && a.breed.toLowerCase().includes(search.toLowerCase()));

    const matchesSpecies = speciesFilter === 'ALL' || a.species === speciesFilter;
    return matchesSearch && matchesSpecies;
  });

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Animal Profiles
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your livestock herds, breeding stock, and companion animals
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <PlusCircle className="h-4 w-4" /> Add Animal
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, breed, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Species Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {['ALL', AnimalSpecies.CATTLE, AnimalSpecies.DOG, AnimalSpecies.CAT, AnimalSpecies.HORSE, AnimalSpecies.OTHER].map(
            (sp) => (
              <button
                key={sp}
                onClick={() => setSpeciesFilter(sp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  speciesFilter === sp
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {sp}
              </button>
            )
          )}
        </div>
      </div>

      {/* Animal Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-card">
          <Layers className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No animals match your criteria</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query or species filter, or add a new animal profile.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((animal) => (
            <Card key={animal.id} className="hover:shadow-md transition-all flex flex-col justify-between">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-lg flex items-center justify-center">
                      {animal.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-tight">{animal.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{animal.breed || 'Breed Unspecified'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {animal.species}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Sex</span>
                    <span className="font-medium text-foreground">{animal.sex}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Weight</span>
                    <span className="font-medium text-foreground">{animal.weight ? `${animal.weight} kg` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">ID / Tag</span>
                    <span className="font-mono text-foreground text-[11px] truncate block">
                      {animal.identificationNumber || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 block">Registered</span>
                    <span className="text-foreground">{formatDate(animal.createdAt)}</span>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 pt-0 border-t border-border/50 flex items-center justify-between">
                <Link to={`/animals/${animal.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                    View Health & Scans <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Animal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Animal Profile"
        description="Provide identification and baseline information for this animal"
      >
        {modalError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Validation Error</AlertTitle>
            <AlertDescription>{modalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleCreateAnimal} className="space-y-4">
          <Input
            label="Animal Name / Tag"
            placeholder="e.g. Bella"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Species
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value as AnimalSpecies)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={AnimalSpecies.CATTLE}>Cattle (Bovine)</option>
                <option value={AnimalSpecies.DOG}>Dog (Canine)</option>
                <option value={AnimalSpecies.CAT}>Cat (Feline)</option>
                <option value={AnimalSpecies.HORSE}>Horse (Equine)</option>
                <option value={AnimalSpecies.SHEEP}>Sheep (Ovine)</option>
                <option value={AnimalSpecies.GOAT}>Goat (Caprine)</option>
                <option value={AnimalSpecies.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as AnimalSex)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={AnimalSex.UNKNOWN}>Unknown</option>
                <option value={AnimalSex.FEMALE}>Female</option>
                <option value={AnimalSex.MALE}>Male</option>
                <option value={AnimalSex.FEMALE_SPAYED}>Female (Spayed)</option>
                <option value={AnimalSex.MALE_NEUTERED}>Male (Neutered)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Breed"
              placeholder="e.g. Holstein Friesian"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 580.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Identification (RFID/Ear Tag)"
              placeholder="e.g. RFID-9820004123"
              value={identificationNumber}
              onChange={(e) => setIdentificationNumber(e.target.value)}
            />
            <Input
              label="Color / Markings"
              placeholder="e.g. Black and White"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          <Input
            label="Date of Birth (Estimated)"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Initial Notes / Observations
            </label>
            <textarea
              rows={3}
              placeholder="Any prior medical conditions, baseline skin notes, or pasture assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
