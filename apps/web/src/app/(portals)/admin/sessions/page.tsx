'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Users,
  FileText,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface SessionWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
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

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<SessionWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionCode, setNewSessionCode] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.get<SessionWithCounts[]>('/sessions');
      setSessions(data);
    } catch (err: unknown) {
      toast.error((err as ApiError).message || 'Impossible de charger les sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !newSessionCode.trim()) return;

    setCreating(true);
    try {
      await api.post('/sessions', {
        name: newSessionName.trim(),
        description: newSessionDescription.trim() || undefined,
        adminCode: newSessionCode.trim(),
      });
      toast.success('Session créée avec succès');
      setShowCreateDialog(false);
      setNewSessionName('');
      setNewSessionCode('');
      setNewSessionDescription('');
      fetchSessions();
    } catch (err: unknown) {
      toast.error((err as ApiError).message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusAction = async (
    sessionId: string,
    action: 'activate' | 'close' | 'draft'
  ) => {
    setActionLoading(`${sessionId}-${action}`);
    try {
      await api.post(`/sessions/${sessionId}/${action}`);
      const labels = {
        activate: 'Session activée',
        close: 'Session terminée',
        draft: 'Session remise en brouillon',
      };
      toast.success(labels[action]);
      fetchSessions();
    } catch (err: unknown) {
      toast.error((err as ApiError).message || 'Erreur lors du changement de statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    setActionLoading(`${sessionId}-delete`);
    try {
      await api.delete(`/sessions/${sessionId}`);
      toast.success('Session supprimée');
      setDeleteConfirm(null);
      fetchSessions();
    } catch (err: unknown) {
      toast.error((err as ApiError).message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Gestion des Sessions
        </h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucune session</p>
            <p className="text-slate-400 mb-6">
              Créez votre première session d'évaluation pour commencer.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/sessions/${session.id}`)
                    }
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {session.name}
                      </h3>
                      <StatusBadge status={session.status} />
                    </div>
                    {session.description && (
                      <p className="text-sm text-slate-500 mb-3">
                        {session.description}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4" />
                        {session._count.criteria} critères
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {session._count.evaluators} évaluateurs
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {session._count.teams} équipes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {session._count.projects} projets
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {session.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() =>
                          handleStatusAction(session.id, 'activate')
                        }
                        disabled={
                          actionLoading === `${session.id}-activate`
                        }
                      >
                        {actionLoading === `${session.id}-activate` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activer
                          </>
                        )}
                      </Button>
                    )}
                    {session.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() =>
                          handleStatusAction(session.id, 'close')
                        }
                        disabled={actionLoading === `${session.id}-close`}
                      >
                        {actionLoading === `${session.id}-close` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Square className="w-4 h-4 mr-1" />
                            Terminer
                          </>
                        )}
                      </Button>
                    )}
                    {session.status === 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusAction(session.id, 'draft')
                        }
                        disabled={actionLoading === `${session.id}-draft`}
                      >
                        {actionLoading === `${session.id}-draft` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Brouillon
                          </>
                        )}
                      </Button>
                    )}
                    {session.status !== 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusAction(session.id, 'draft')
                        }
                        disabled={actionLoading === `${session.id}-draft`}
                        className={
                          session.status === 'ACTIVE'
                            ? 'text-slate-600'
                            : 'hidden'
                        }
                      >
                        {actionLoading === `${session.id}-draft` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Brouillon
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(session.id)}
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

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle session</DialogTitle>
            <DialogDescription>
              Créez une nouvelle session d'évaluation. Le code admin sera utilisé
              pour vous connecter à cette session.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Nom de la session</Label>
              <Input
                id="session-name"
                placeholder="Ex: Selection Projets 2026"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                required
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-description">Description (optionnel)</Label>
              <Input
                id="session-description"
                placeholder="Ex: Session de sélection annuelle"
                value={newSessionDescription}
                onChange={(e) => setNewSessionDescription(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-code">Code admin</Label>
              <Input
                id="session-code"
                type="password"
                placeholder="Code secret d'administration"
                value={newSessionCode}
                onChange={(e) => setNewSessionCode(e.target.value)}
                required
                disabled={creating}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={creating || !newSessionName.trim() || !newSessionCode.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
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
              Cette action est irréversible. Toutes les données de la session
              (critères, évaluateurs, équipes, projets, scores) seront
              définitivement supprimées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={actionLoading?.endsWith('-delete')}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={actionLoading?.endsWith('-delete')}
            >
              {actionLoading?.endsWith('-delete') ? (
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
