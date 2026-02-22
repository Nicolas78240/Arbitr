'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type ApiError } from '@/lib/api-client';

interface Session {
  id: string;
  name: string;
  status: string;
  thresholdX: number;
  thresholdY: number;
  axisLabelX: string | null;
  axisLabelY: string | null;
}

interface Quadrant {
  id: string;
  sessionId: string;
  position: string;
  label: string;
  icon: string;
  color: string;
}

interface QuadrantInput {
  position: string;
  label: string;
  icon: string;
  color: string;
}

const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
const POSITION_LABELS: Record<string, string> = {
  'top-left': 'Haut-Gauche',
  'top-right': 'Haut-Droite',
  'bottom-left': 'Bas-Gauche',
  'bottom-right': 'Bas-Droite',
};

const DEFAULT_QUADRANTS: QuadrantInput[] = [
  { position: 'top-left', label: 'Question Marks', icon: '?', color: '#f59e0b' },
  { position: 'top-right', label: 'Stars', icon: '★', color: '#22c55e' },
  { position: 'bottom-left', label: 'Dogs', icon: '✕', color: '#ef4444' },
  { position: 'bottom-right', label: 'Cash Cows', icon: '$', color: '#3b82f6' },
];

const COLOR_OPTIONS = [
  { value: '#22c55e', label: 'Vert' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#6b7280', label: 'Gris' },
];

export default function AdminQuadrantsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [quadrantData, setQuadrantData] = useState<QuadrantInput[]>(DEFAULT_QUADRANTS);
  const [thresholdX, setThresholdX] = useState(50);
  const [thresholdY, setThresholdY] = useState(50);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
  });

  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }

  const currentSession = sessions.find((s) => s.id === selectedSessionId);

  const { data: quadrants = [], isLoading: loadingQuadrants } = useQuery({
    queryKey: ['admin', 'quadrants', selectedSessionId],
    queryFn: () => api.get<Quadrant[]>(`/sessions/${selectedSessionId}/quadrants`),
    enabled: !!selectedSessionId,
  });

  // Sync quadrant data when loaded from API
  useEffect(() => {
    if (quadrants.length === 4) {
      setQuadrantData(
        POSITIONS.map((pos) => {
          const q = quadrants.find((qu) => qu.position === pos);
          return q
            ? { position: q.position, label: q.label, icon: q.icon, color: q.color }
            : DEFAULT_QUADRANTS.find((d) => d.position === pos)!;
        })
      );
    } else {
      setQuadrantData(DEFAULT_QUADRANTS);
    }
  }, [quadrants]);

  // Sync thresholds from session
  useEffect(() => {
    if (currentSession) {
      setThresholdX(currentSession.thresholdX ?? 50);
      setThresholdY(currentSession.thresholdY ?? 50);
    }
  }, [currentSession]);

  const saveQuadrantsMutation = useMutation({
    mutationFn: (data: QuadrantInput[]) =>
      api.put<Quadrant[]>(`/sessions/${selectedSessionId}/quadrants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'quadrants', selectedSessionId] });
    },
  });

  const saveThresholdsMutation = useMutation({
    mutationFn: (data: { thresholdX: number; thresholdY: number }) =>
      api.patch(`/sessions/${selectedSessionId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    },
  });

  const handleSave = async () => {
    // Validate all quadrants have labels
    for (const q of quadrantData) {
      if (!q.label.trim()) {
        toast.error('Tous les quadrants doivent avoir un nom');
        return;
      }
    }

    try {
      await Promise.all([
        saveQuadrantsMutation.mutateAsync(quadrantData),
        saveThresholdsMutation.mutateAsync({ thresholdX, thresholdY }),
      ]);
      toast.success('Configuration des quadrants sauvegardée');
    } catch (err: unknown) {
      toast.error((err as ApiError).message || 'Erreur lors de la sauvegarde');
    }
  };

  const updateQuadrant = (position: string, field: keyof QuadrantInput, value: string) => {
    setQuadrantData((prev) =>
      prev.map((q) => (q.position === position ? { ...q, [field]: value } : q))
    );
  };

  const isSaving = saveQuadrantsMutation.isPending || saveThresholdsMutation.isPending;

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Configuration des Quadrants</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Aucune session. Créez d'abord une session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Configuration des Quadrants</h1>
        <div className="flex items-center gap-3">
          {sessions.length > 1 && (
            <Select
              value={selectedSessionId || ''}
              onValueChange={(v) => setSelectedSessionId(v)}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Sélectionner une session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </div>

      {loadingQuadrants ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seuils des axes</CardTitle>
              <CardDescription>
                Définissez les seuils qui séparent les quadrants sur chaque axe (en pourcentage).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="threshold-x">
                    Seuil axe X: {thresholdX}%
                  </Label>
                  <input
                    id="threshold-x"
                    type="range"
                    min="10"
                    max="90"
                    value={thresholdX}
                    onChange={(e) => setThresholdX(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>10%</span>
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="threshold-y">
                    Seuil axe Y: {thresholdY}%
                  </Label>
                  <input
                    id="threshold-y"
                    type="range"
                    min="10"
                    max="90"
                    value={thresholdY}
                    onChange={(e) => setThresholdY(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>10%</span>
                    <span>50%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual 2x2 grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aperçu de la matrice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto aspect-square">
                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(
                  (pos) => {
                    const q = quadrantData.find((qu) => qu.position === pos);
                    if (!q) return null;
                    return (
                      <div
                        key={pos}
                        className="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors"
                        style={{
                          borderColor: q.color,
                          backgroundColor: `${q.color}15`,
                        }}
                      >
                        <span className="text-2xl mb-2">{q.icon}</span>
                        <span
                          className="text-sm font-medium text-center"
                          style={{ color: q.color }}
                        >
                          {q.label || POSITION_LABELS[pos]}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
              <div className="flex justify-center gap-8 mt-4 text-xs text-slate-400">
                <span>Axe X (seuil: {thresholdX}%)</span>
                <span>Axe Y (seuil: {thresholdY}%)</span>
              </div>
            </CardContent>
          </Card>

          {/* Quadrant config forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {POSITIONS.map((pos) => {
              const q = quadrantData.find((qu) => qu.position === pos);
              if (!q) return null;
              return (
                <Card key={pos}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: q.color }}
                      />
                      {POSITION_LABELS[pos]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom</Label>
                      <Input
                        value={q.label}
                        onChange={(e) => updateQuadrant(pos, 'label', e.target.value)}
                        placeholder="Nom du quadrant"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Icône</Label>
                      <Input
                        value={q.icon}
                        onChange={(e) => updateQuadrant(pos, 'icon', e.target.value)}
                        placeholder="Ex: ★"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Couleur</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={q.color}
                          onValueChange={(v) => updateQuadrant(pos, 'color', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: q.color }}
                              />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: opt.value }}
                                  />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="color"
                          value={q.color}
                          onChange={(e) => updateQuadrant(pos, 'color', e.target.value)}
                          className="w-10 h-10 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
