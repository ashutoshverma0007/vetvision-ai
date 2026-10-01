import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { Camera, Upload, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

export function NewScanPage() {
  const { id: animalId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bodyPart, setBodyPart] = useState('Lateral Neck / Shoulder');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !animalId) {
      setError('Please select an image file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bodyPart', bodyPart);
    if (notes) formData.append('notes', notes);

    try {
      const res = await api.scans.upload(animalId, formData);
      navigate(`/scans/${res.scan.id}`);
    } catch (err: any) {
      setError(err.message || 'Image upload or AI evaluation failed.');
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <Link
        to={`/animals/${animalId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Animal Profile
      </Link>

      <Card className="shadow-lg border-border/80">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Camera className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Upload Lesion Screening Scan</CardTitle>
          <CardDescription className="text-xs">
            Submit close-up photographs of suspected skin nodules or cutaneous eruptions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload Area / Preview */}
            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-colors">
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative mx-auto max-h-64 overflow-hidden rounded-xl bg-black/5 flex items-center justify-center">
                    <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-lg" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {file?.name} ({(file!.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                  <label className="inline-block cursor-pointer">
                    <span className="text-xs font-semibold text-emerald-600 hover:underline">
                      Choose a different photo
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-6">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Click to select image or drag and drop</span>
                  <span className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WEBP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                </label>
              )}
            </div>

            {/* Anatomical Body Part Location */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Anatomical Location
              </label>
              <select
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Lateral Neck / Shoulder">Lateral Neck / Shoulder</option>
                <option value="Torso / Lateral Flank">Torso / Lateral Flank</option>
                <option value="Perineum / Udder / Scrotum">Perineum / Udder / Scrotum</option>
                <option value="Muzzle / Head / Oral Cavity">Muzzle / Head / Oral Cavity</option>
                <option value="Limbs / Extremities">Limbs / Extremities</option>
                <option value="Other Cutaneous Region">Other Cutaneous Region</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Clinical Context / Onset Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Observed onset date, nodule firmness, presence of fever..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-base shadow-sm"
              isLoading={isUploading}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Executing Screening Pipeline...' : 'Upload & Run AI Screening'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
