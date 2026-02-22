'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api, type ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface Session {
  id: string;
  name: string;
  status: string;
}

interface Criterion {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  axis: 'X' | 'Y';
  min: number;
  max: number;
  weight: number;
  order: number;
}

export default function AdminCriteriaPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAxis, setFormAxis] = useState<'X' | 'Y'>('X');
  const [formWeight, setFormWeight] = useState('');
  const [formMin, setFormMin] = useState('0');
  const [formMax, setFormMax] = useState('5');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
  });

  // Auto-select first session
  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }

  const { data: criteria = [], isLoading: loadingCriteria } = useQuery({
    queryKey: ['admin', 'criteria', selectedSessionId],
    queryFn: () => api.get<Criterion[]>(`/sessions/${selectedSessionId}/criteria`),
    enabled: !!selectedSessionId,
  });

  const criteriaX = criteria.filter((c) => c.axis === 'X');
  const criteriaY = criteria.filter((c) => c.axis === 'Y');
  const sumX = criteriaX.reduce((sum, c) => sum + c.weight, 0);
  const sumY = criteriaY.reduce((sum, c) => sum + c.weight, 0);

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      axis: 'X' | 'Y';
      weight: number;
      min: number;
      max: number;
    }) => api.post<Criterion>(`/sessions/${selectedSessionId}/criteria`, data),
    onSuccess: () => {
      toast.success('Critère créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'criteria', selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      resetForm();
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Criterion>;
    }) => api.patch<Criterion>(`/sessions/${selectedSessionId}/criteria/${id}`, data),
    onSuccess: () => {
      toast.success('Critère mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin', 'criteria', selectedSessionId] });
      resetForm();
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/sessions/${selectedSessionId}/criteria/${id}`),
    onSuccess: () => {
      toast.success('Critère supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin', 'criteria', selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setDeleteConfirm(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la suppression');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.post(`/sessions/${selectedSessionId}/criteria/reorder`, { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'criteria', selectedSessionId] });
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors du réordonnancement');
    },
  });

  const moveCriterion = (items: Criterion[], index: number, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    reorderMutation.mutate(reordered.map((c) => c.id));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCriterion(null);
    setFormName('');
    setFormDescription('');
    setFormAxis('X');
    setFormWeight('');
    setFormMin('0');
    setFormMax('5');
  };

  const openEditForm = (criterion: Criterion) => {
    setEditingCriterion(criterion);
    setFormName(criterion.name);
    setFormDescription(criterion.description || '');
    setFormAxis(criterion.axis);
    setFormWeight(String(criterion.weight));
    setFormMin(String(criterion.min));
    setFormMax(String(criterion.max));
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = Number(formWeight);
    const min = Number(formMin);
    const max = Number(formMax);

    if (!formName.trim() || isNaN(weight) || weight <= 0) return;

    if (editingCriterion) {
      updateMutation.mutate({
        id: editingCriterion.id,
        data: {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          axis: formAxis,
          weight,
          min,
          max,
        },
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        axis: formAxis,
        weight,
        min,
        max,
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Gestion des Critères</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Aucune session. Créez d'abord une session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderCriteriaList = (items: Criterion[], axisLabel: string, sum: number) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-500">
          Poids total: {sum}%
        </span>
        {sum !== 100 && sum > 0 && (
          <span className="flex items-center gap-1 text-sm text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            {sum < 100
              ? `Il manque ${100 - sum}% pour atteindre 100%`
              : `Dépasse 100% de ${sum - 100}%`}
          </span>
        )}
        {sum === 100 && (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            100% - Complet
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">
          Aucun critère pour l'axe {axisLabel}
        </p>
      ) : (
        [...items].sort((a, b) => a.order - b.order).map((criterion, index) => (
          <Card key={criterion.id} className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">{criterion.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {criterion.weight}%
                    </Badge>
                    <span className="text-xs text-slate-400">
                      (note: {criterion.min} - {criterion.max})
                    </span>
                  </div>
                  {criterion.description && (
                    <p className="text-sm text-slate-500">{criterion.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => moveCriterion(items, index, 'up')}
                    title="Monter"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index === items.length - 1 || reorderMutation.isPending}
                    onClick={() => moveCriterion(items, index, 'down')}
                    title="Descendre"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditForm(criterion)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(criterion.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Critères</h1>
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
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un critère
          </Button>
        </div>
      </div>

      {loadingCriteria ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <Tabs defaultValue="X">
          <TabsList>
            <TabsTrigger value="X">
              Axe X ({criteriaX.length} critères - {sumX}%)
            </TabsTrigger>
            <TabsTrigger value="Y">
              Axe Y ({criteriaY.length} critères - {sumY}%)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="X" className="mt-4">
            {renderCriteriaList(criteriaX, 'X', sumX)}
          </TabsContent>
          <TabsContent value="Y" className="mt-4">
            {renderCriteriaList(criteriaY, 'Y', sumY)}
          </TabsContent>
        </Tabs>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCriterion ? 'Modifier le critère' : 'Ajouter un critère'}
            </DialogTitle>
            <DialogDescription>
              {editingCriterion
                ? 'Modifiez les propriétés du critère d\'évaluation.'
                : 'Définissez un nouveau critère d\'évaluation pour cette session.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criterion-name">Nom</Label>
              <Input
                id="criterion-name"
                placeholder="Ex: Innovation"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                disabled={isMutating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criterion-description">Description (optionnel)</Label>
              <Textarea
                id="criterion-description"
                placeholder="Description du critère..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={isMutating}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criterion-axis">Axe</Label>
                <Select
                  value={formAxis}
                  onValueChange={(v) => setFormAxis(v as 'X' | 'Y')}
                  disabled={isMutating}
                >
                  <SelectTrigger id="criterion-axis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="X">Axe X</SelectItem>
                    <SelectItem value="Y">Axe Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="criterion-weight">Poids (%)</Label>
                <Input
                  id="criterion-weight"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Ex: 25"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  required
                  disabled={isMutating}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criterion-min">Note min</Label>
                <Input
                  id="criterion-min"
                  type="number"
                  value={formMin}
                  onChange={(e) => setFormMin(e.target.value)}
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criterion-max">Note max</Label>
                <Input
                  id="criterion-max"
                  type="number"
                  value={formMax}
                  onChange={(e) => setFormMax(e.target.value)}
                  disabled={isMutating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isMutating}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isMutating || !formName.trim() || !formWeight}>
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingCriterion ? 'Mise à jour...' : 'Création...'}
                  </>
                ) : editingCriterion ? (
                  'Mettre à jour'
                ) : (
                  'Créer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le critère et tous les scores
              associés seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
