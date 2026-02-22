'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

interface Session {
  id: string;
  name: string;
  status: string;
}

type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT' | 'EMAIL' | 'URL';

interface FormField {
  id: string;
  sessionId: string;
  label: string;
  placeholder: string | null;
  type: FieldType;
  required: boolean;
  options: string[] | null;
  order: number;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'TEXT', label: 'Texte' },
  { value: 'TEXTAREA', label: 'Zone de texte' },
  { value: 'NUMBER', label: 'Nombre' },
  { value: 'SELECT', label: 'Liste déroulante' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'URL', label: 'URL' },
];

const fieldTypeBadgeClass: Record<FieldType, string> = {
  TEXT: 'bg-blue-100 text-blue-700 border-blue-200',
  TEXTAREA: 'bg-purple-100 text-purple-700 border-purple-200',
  NUMBER: 'bg-green-100 text-green-700 border-green-200',
  SELECT: 'bg-orange-100 text-orange-700 border-orange-200',
  EMAIL: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  URL: 'bg-pink-100 text-pink-700 border-pink-200',
};

export default function AdminFieldsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formPlaceholder, setFormPlaceholder] = useState('');
  const [formType, setFormType] = useState<FieldType>('TEXT');
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
  });

  // Auto-select first session
  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }

  const { data: fields = [], isLoading: loadingFields } = useQuery({
    queryKey: ['admin', 'fields', selectedSessionId],
    queryFn: () => api.get<FormField[]>(`/sessions/${selectedSessionId}/fields`),
    enabled: !!selectedSessionId,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      label: string;
      placeholder?: string;
      type: FieldType;
      required?: boolean;
      options?: string[];
      order?: number;
    }) => api.post<FormField>(`/sessions/${selectedSessionId}/fields`, data),
    onSuccess: () => {
      toast.success('Champ créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'fields', selectedSessionId] });
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
      data: Partial<{
        label: string;
        placeholder: string;
        type: FieldType;
        required: boolean;
        options: string[];
      }>;
    }) => api.patch<FormField>(`/sessions/${selectedSessionId}/fields/${id}`, data),
    onSuccess: () => {
      toast.success('Champ mis à jour');
      queryClient.invalidateQueries({ queryKey: ['admin', 'fields', selectedSessionId] });
      resetForm();
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/sessions/${selectedSessionId}/fields/${id}`),
    onSuccess: () => {
      toast.success('Champ supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin', 'fields', selectedSessionId] });
      setDeleteConfirm(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la suppression');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) =>
      api.post(`/sessions/${selectedSessionId}/fields/reorder`, { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fields', selectedSessionId] });
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors du reordonnancement');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingField(null);
    setFormLabel('');
    setFormPlaceholder('');
    setFormType('TEXT');
    setFormRequired(false);
    setFormOptions('');
  };

  const openEditForm = (field: FormField) => {
    setEditingField(field);
    setFormLabel(field.label);
    setFormPlaceholder(field.placeholder || '');
    setFormType(field.type);
    setFormRequired(field.required);
    setFormOptions(field.options ? field.options.join(', ') : '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) return;

    const options =
      formType === 'SELECT'
        ? formOptions
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    if (editingField) {
      updateMutation.mutate({
        id: editingField.id,
        data: {
          label: formLabel.trim(),
          placeholder: formPlaceholder.trim() || undefined,
          type: formType,
          required: formRequired,
          ...(formType === 'SELECT' ? { options } : { options: undefined }),
        },
      });
    } else {
      createMutation.mutate({
        label: formLabel.trim(),
        placeholder: formPlaceholder.trim() || undefined,
        type: formType,
        required: formRequired,
        ...(formType === 'SELECT' ? { options } : {}),
      });
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    reorderMutation.mutate(reordered.map((f) => f.id));
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Gestion des Champs</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-600">Aucune session. Créez d&apos;abord une session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Champs</h1>
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
            Ajouter un champ
          </Button>
        </div>
      </div>

      {loadingFields ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : sortedFields.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">
              Aucun champ pour cette session. Ajoutez des champs pour le formulaire de soumission.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedFields.map((field, index) => (
            <Card key={field.id} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <span className="text-sm font-mono text-slate-400 w-6 text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{field.label}</span>
                        <Badge className={fieldTypeBadgeClass[field.type]}>
                          {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                        </Badge>
                        {field.required && (
                          <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                            Obligatoire
                          </Badge>
                        )}
                      </div>
                      {field.placeholder && (
                        <p className="text-sm text-slate-500">
                          Placeholder : {field.placeholder}
                        </p>
                      )}
                      {field.type === 'SELECT' && field.options && field.options.length > 0 && (
                        <p className="text-sm text-slate-500">
                          Options : {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => moveField(index, 'up')}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === sortedFields.length - 1 || reorderMutation.isPending}
                      onClick={() => moveField(index, 'down')}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditForm(field)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(field.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Modifier le champ' : 'Ajouter un champ'}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? 'Modifiez les propriétés du champ de formulaire.'
                : 'Définissez un nouveau champ pour le formulaire de soumission.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Libellé</Label>
              <Input
                id="field-label"
                placeholder="Ex: Nom du projet"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                disabled={isMutating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder (optionnel)</Label>
              <Input
                id="field-placeholder"
                placeholder="Ex: Saisissez le nom de votre projet"
                value={formPlaceholder}
                onChange={(e) => setFormPlaceholder(e.target.value)}
                disabled={isMutating}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field-type">Type</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as FieldType)}
                  disabled={isMutating}
                >
                  <SelectTrigger id="field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-required">Obligatoire</Label>
                <div className="flex items-center h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="field-required"
                      type="checkbox"
                      checked={formRequired}
                      onChange={(e) => setFormRequired(e.target.checked)}
                      disabled={isMutating}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">
                      {formRequired ? 'Oui' : 'Non'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            {formType === 'SELECT' && (
              <div className="space-y-2">
                <Label htmlFor="field-options">Options (séparées par des virgules)</Label>
                <Textarea
                  id="field-options"
                  placeholder="Ex: Option 1, Option 2, Option 3"
                  value={formOptions}
                  onChange={(e) => setFormOptions(e.target.value)}
                  disabled={isMutating}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isMutating}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isMutating || !formLabel.trim()}>
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingField ? 'Mise à jour...' : 'Création...'}
                  </>
                ) : editingField ? (
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
              Cette action est irréversible. Le champ sera définitivement supprimé
              du formulaire de soumission.
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
