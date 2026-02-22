'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Users,
  CheckCircle2,
  XCircle,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { api, type ApiError } from '@/lib/api-client';

interface Session {
  id: string;
  name: string;
  status: string;
}

interface Team {
  id: string;
  sessionId: string;
  name: string;
  project: { id: string; name: string } | null;
}

interface TeamWithCode extends Team {
  code: string;
}

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editTeam, setEditTeam] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');

  // Store newly created team codes
  const [createdCodes, setCreatedCodes] = useState<Record<string, string>>({});
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => api.get<Session[]>('/sessions'),
  });

  if (!selectedSessionId && sessions.length > 0) {
    setSelectedSessionId(sessions[0].id);
  }

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['admin', 'teams', selectedSessionId],
    queryFn: () => api.get<Team[]>(`/sessions/${selectedSessionId}/teams`),
    enabled: !!selectedSessionId,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post<TeamWithCode>(`/sessions/${selectedSessionId}/teams`, { name }),
    onSuccess: (data) => {
      toast.success(`Équipe "${data.name}" créée`);
      setCreatedCodes((prev) => ({ ...prev, [data.id]: data.code }));
      setVisibleCodes((prev) => ({ ...prev, [data.id]: true }));
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setShowCreateDialog(false);
      setNewName('');
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la creation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/sessions/${selectedSessionId}/teams/${id}`),
    onSuccess: () => {
      toast.success('Équipe supprimée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', selectedSessionId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setDeleteConfirm(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la suppression');
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`/sessions/${selectedSessionId}/teams/${id}`, { name }),
    onSuccess: () => {
      toast.success('Nom modifié avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'teams', selectedSessionId] });
      setEditTeam(null);
      setEditName('');
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la modification');
    },
  });

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editTeam) return;
    renameMutation.mutate({ id: editTeam.id, name: editName.trim() });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copié dans le presse-papier');
  };

  const toggleCodeVisibility = (id: string) => {
    setVisibleCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Gestion des Équipes</h1>
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
        <h1 className="text-3xl font-bold text-slate-900">Gestion des Équipes</h1>
        <div className="flex items-center gap-3">
          {sessions.length > 1 && (
            <Select
              value={selectedSessionId || ''}
              onValueChange={(v) => {
                setSelectedSessionId(v);
                setCreatedCodes({});
                setVisibleCodes({});
              }}
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
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une équipe
          </Button>
        </div>
      </div>

      {loadingTeams ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucune équipe</p>
            <p className="text-slate-400 mb-6">
              Ajoutez des équipes pour qu'elles puissent soumettre leurs projets.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une équipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">
                      Nom
                    </th>
                    <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">
                      Code d'accès
                    </th>
                    <th className="text-left text-sm font-medium text-slate-500 px-6 py-3">
                      Projet soumis
                    </th>
                    <th className="text-right text-sm font-medium text-slate-500 px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => {
                    const code = createdCodes[team.id];
                    const isVisible = visibleCodes[team.id];
                    return (
                      <tr
                        key={team.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-1">
                            {team.name}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditTeam({ id: team.id, name: team.name });
                                setEditName(team.name);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {code ? (
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                                {isVisible ? code : '********'}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleCodeVisibility(team.id)}
                              >
                                {isVisible ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyCode(code)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400 font-mono">
                              ********
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {team.project ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-700">
                                {team.project.name}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-slate-300" />
                              <span className="text-sm text-slate-400">Non soumis</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirm(team.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une équipe</DialogTitle>
            <DialogDescription>
              Le code d'accès sera généré automatiquement. Vous pourrez le copier après la creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nom de l'équipe</Label>
              <Input
                id="team-name"
                placeholder="Ex: Équipe Alpha"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !newName.trim()}
              >
                {createMutation.isPending ? (
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

      {/* Edit Team Name Dialog */}
      <Dialog
        open={editTeam !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTeam(null);
            setEditName('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le nom de l'équipe</DialogTitle>
            <DialogDescription>
              Entrez le nouveau nom pour cette équipe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">Nom</Label>
              <Input
                id="edit-team-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                disabled={renameMutation.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditTeam(null);
                  setEditName('');
                }}
                disabled={renameMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={renameMutation.isPending || !editName.trim()}
              >
                {renameMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Modification...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delété Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L'équipe, son projet et tous les scores
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
