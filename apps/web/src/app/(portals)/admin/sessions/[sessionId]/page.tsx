'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Loader2,
  Play,
  Square,
  RotateCcw,
  Users,
  FileText,
  BarChart3,
  Target,
  CalendarDays,
  Settings,
  ClipboardList,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, type ApiError } from '@/lib/api-client';
import { useState } from 'react';

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  axis: 'X' | 'Y';
  weight: number;
  order: number;
}

interface Evaluator {
  id: string;
  sessionId: string;
  name: string;
}

interface Team {
  id: string;
  sessionId: string;
  name: string;
  project: {
    id: string;
    name: string;
    teamName: string;
  } | null;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
}

interface Quadrant {
  id: string;
  position: string;
  label: string;
  icon: string | null;
  color: string;
}

interface SessionDetail {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  thresholdX: number;
  thresholdY: number;
  axisLabelX: string;
  axisLabelY: string;
  labelEvaluator: string;
  labelTeam: string;
  labelProject: string;
  criteria: Criterion[];
  evaluators: Evaluator[];
  teams: Team[];
  fields: FormField[];
  quadrants: Quadrant[];
  _count: {
    projects: number;
    evaluators: number;
    teams: number;
    criteria: number;
  };
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
          Brouillon
        </Badge>
      );
    case 'ACTIVE':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Active
        </Badge>
      );
    case 'CLOSED':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          Terminée
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminSessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'activate' | 'close' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    axisLabelX: '',
    axisLabelY: '',
    thresholdX: 3,
    thresholdY: 3,
    labelEvaluator: '',
    labelTeam: '',
    labelProject: '',
  });

  const { data: session, isLoading, error } = useQuery<SessionDetail>({
    queryKey: ['admin', 'session', params.sessionId],
    queryFn: () => api.get<SessionDetail>(`/sessions/${params.sessionId}`),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${params.sessionId}/activate`),
    onSuccess: () => {
      toast.success('Session activée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'session', params.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setConfirmAction(null);
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erreur'),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${params.sessionId}/close`),
    onSuccess: () => {
      toast.success('Session terminée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'session', params.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setConfirmAction(null);
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erreur'),
  });

  const draftMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${params.sessionId}/draft`),
    onSuccess: () => {
      toast.success('Session remise en brouillon');
      queryClient.invalidateQueries({ queryKey: ['admin', 'session', params.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editForm) =>
      api.patch(`/sessions/${params.sessionId}`, data),
    onSuccess: () => {
      toast.success('Session mise à jour');
      queryClient.invalidateQueries({ queryKey: ['admin', 'session', params.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setIsEditing(false);
    },
    onError: (err: ApiError) => toast.error(err.message || 'Erreur lors de la mise à jour'),
  });

  const enterEditMode = () => {
    if (!session) return;
    setEditForm({
      name: session.name,
      description: session.description || '',
      axisLabelX: session.axisLabelX,
      axisLabelY: session.axisLabelY,
      thresholdX: session.thresholdX,
      thresholdY: session.thresholdY,
      labelEvaluator: session.labelEvaluator,
      labelTeam: session.labelTeam,
      labelProject: session.labelProject,
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Session introuvable</p>
            <p className="text-slate-400 mb-6">
              {(error as unknown as Record<string, string>)?.message || 'Cette session n\'existe pas ou a été supprimée.'}
            </p>
            <Button variant="outline" onClick={() => router.push('/admin/sessions')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criteriaX = session.criteria.filter((c) => c.axis === 'X');
  const criteriaY = session.criteria.filter((c) => c.axis === 'Y');
  const teamsWithProject = session.teams.filter((t) => t.project);
  const teamsWithoutProject = session.teams.filter((t) => !t.project);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/sessions')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Sessions
          </Button>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-bold h-auto py-1 px-2 max-w-md"
              />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">{session.name}</h1>
            )}
            <StatusBadge status={session.status} />
            {!isEditing && session.status === 'DRAFT' && (
              <Button variant="ghost" size="sm" onClick={enterEditMode}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === 'DRAFT' && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setConfirmAction('activate')}
            >
              <Play className="w-4 h-4 mr-1" />
              Activer
            </Button>
          )}
          {session.status === 'ACTIVE' && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmAction('close')}
              >
                <Square className="w-4 h-4 mr-1" />
                Terminer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => draftMutation.mutate()}
                disabled={draftMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Brouillon
              </Button>
            </>
          )}
          {session.status === 'CLOSED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => draftMutation.mutate()}
              disabled={draftMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Brouillon
            </Button>
          )}
        </div>
      </div>

      {/* Description & dates */}
      {session.description && (
        <p className="text-sm text-slate-500">{session.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" />
          Créée le {new Date(session.createdAt).toLocaleDateString('fr-FR')}
        </span>
        <span>
          Mise à jour le {new Date(session.updatedAt).toLocaleDateString('fr-FR')}
        </span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{session._count.criteria}</p>
                <p className="text-xs text-slate-500">Critères</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{session._count.evaluators}</p>
                <p className="text-xs text-slate-500">Évaluateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{session._count.teams}</p>
                <p className="text-xs text-slate-500">Équipes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{session._count.projects}</p>
                <p className="text-xs text-slate-500">Projets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description de la session"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Axes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Axes</h4>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Axe X</label>
                      <Input
                        value={editForm.axisLabelX}
                        onChange={(e) => setEditForm({ ...editForm, axisLabelX: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Axe Y</label>
                      <Input
                        value={editForm.axisLabelY}
                        onChange={(e) => setEditForm({ ...editForm, axisLabelY: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Thresholds */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Seuils</h4>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Seuil X</label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={editForm.thresholdX}
                        onChange={(e) => setEditForm({ ...editForm, thresholdX: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Seuil Y</label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={editForm.thresholdY}
                        onChange={(e) => setEditForm({ ...editForm, thresholdY: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Labels</h4>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Évaluateur</label>
                      <Input
                        value={editForm.labelEvaluator}
                        onChange={(e) => setEditForm({ ...editForm, labelEvaluator: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Équipe</label>
                      <Input
                        value={editForm.labelTeam}
                        onChange={(e) => setEditForm({ ...editForm, labelTeam: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Projet</label>
                      <Input
                        value={editForm.labelProject}
                        onChange={(e) => setEditForm({ ...editForm, labelProject: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Quadrants (read-only in edit mode) */}
                {session.quadrants.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">Quadrants</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {session.quadrants.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                          style={{ backgroundColor: q.color + '18' }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: q.color }}
                          />
                          <span className="font-medium truncate">
                            {q.icon ? `${q.icon} ` : ''}{q.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Enregistrer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                >
                  <X className="w-4 h-4 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Axes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Axe X</span>
                    <span className="font-medium">{session.axisLabelX}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Axe Y</span>
                    <span className="font-medium">{session.axisLabelY}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Seuils</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seuil X</span>
                    <span className="font-mono font-medium">{session.thresholdX}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Seuil Y</span>
                    <span className="font-mono font-medium">{session.thresholdY}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Labels</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Évaluateur</span>
                    <span className="font-medium">{session.labelEvaluator || '\u2014'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Équipe</span>
                    <span className="font-medium">{session.labelTeam || '\u2014'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Projet</span>
                    <span className="font-medium">{session.labelProject || '\u2014'}</span>
                  </div>
                </div>
              </div>
              {session.quadrants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700">Quadrants</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {session.quadrants.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                        style={{ backgroundColor: q.color + '18' }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: q.color }}
                        />
                        <span className="font-medium truncate">
                          {q.icon ? `${q.icon} ` : ''}{q.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5" />
            Critères ({session.criteria.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.criteria.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucun critère configuré</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Axe X — {session.axisLabelX} ({criteriaX.length})
                </h4>
                <div className="space-y-2">
                  {criteriaX.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-700">{c.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.weight}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Axe Y — {session.axisLabelY} ({criteriaY.length})
                </h4>
                <div className="space-y-2">
                  {criteriaY.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-700">{c.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.weight}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            Évaluateurs ({session.evaluators.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.evaluators.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucun évaluateur configuré</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {session.evaluators.map((e) => (
                <Badge key={e.id} variant="secondary" className="text-sm py-1 px-3">
                  {e.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams & Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5" />
            Équipes & Projets ({session.teams.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.teams.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucune équipe configurée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Équipe</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Projet</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsWithProject.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-700">{t.name}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{t.project!.name}</td>
                      <td className="py-2 px-3">
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          Soumis
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {teamsWithoutProject.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-700">{t.name}</td>
                      <td className="py-2 px-3 text-slate-400 italic">Aucun projet</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs text-slate-500">
                          En attente
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      {session.fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Champs du formulaire ({session.fields.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {session.fields.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-700">{f.label}</span>
                    {f.required && (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                        Requis
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {f.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm action dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'activate' ? 'Activer la session' : 'Terminer la session'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'activate'
                ? 'L\'activation permettra aux évaluateurs et équipes de se connecter. La configuration ne pourra plus être modifiée.'
                : 'La clôture arrêtera les évaluations et rendra les résultats visibles.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={activateMutation.isPending || closeMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (confirmAction === 'activate') activateMutation.mutate();
                else closeMutation.mutate();
              }}
              disabled={activateMutation.isPending || closeMutation.isPending}
              className={confirmAction === 'close' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {(activateMutation.isPending || closeMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {confirmAction === 'activate' ? 'Activer' : 'Terminer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
