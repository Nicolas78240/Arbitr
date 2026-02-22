'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  Play,
  Square,
  RotateCcw,
  Users,
  FileText,
  BarChart3,
  Target,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { api, type ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface SessionWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  thresholdX: number;
  thresholdY: number;
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

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'close' | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => api.get<SessionWithCounts[]>('/sessions'),
  });

  const currentSession = selectedSessionId
    ? sessions.find((s) => s.id === selectedSessionId)
    : sessions[0];

  // Auto-select first session
  if (!selectedSessionId && sessions.length > 0 && currentSession) {
    setSelectedSessionId(currentSession.id);
  }

  const activateMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/sessions/${sessionId}/activate`),
    onSuccess: () => {
      toast.success('Session activée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setConfirmAction(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de l\'activation');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/sessions/${sessionId}/close`),
    onSuccess: () => {
      toast.success('Session terminée avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
      setConfirmAction(null);
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors de la clôture');
    },
  });

  const draftMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/sessions/${sessionId}/draft`),
    onSuccess: () => {
      toast.success('Session remise en brouillon');
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] });
    },
    onError: (err: ApiError) => {
      toast.error(err.message || 'Erreur lors du changement de statut');
    },
  });

  const handleConfirmedAction = () => {
    if (!currentSession) return;
    if (confirmAction === 'activate') {
      activateMutation.mutate(currentSession.id);
    } else if (confirmAction === 'close') {
      closeMutation.mutate(currentSession.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Tableau de bord
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucune session</p>
            <p className="text-slate-400">
              Créez votre première session depuis la page Sessions pour commencer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Tableau de bord
        </h1>
        {sessions.length > 1 && (
          <Select
            value={selectedSessionId || ''}
            onValueChange={(v) => setSelectedSessionId(v)}
          >
            <SelectTrigger className="w-[280px]">
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
      </div>

      {currentSession && (
        <>
          {/* Session overview */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{currentSession.name}</CardTitle>
                  <StatusBadge status={currentSession.status} />
                </div>
                <div className="flex items-center gap-2">
                  {currentSession.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setConfirmAction('activate')}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Activer la session
                    </Button>
                  )}
                  {currentSession.status === 'ACTIVE' && (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmAction('close')}
                      >
                        <Square className="w-4 h-4 mr-1" />
                        Terminer la session
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => draftMutation.mutate(currentSession.id)}
                        disabled={draftMutation.isPending}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Brouillon
                      </Button>
                    </>
                  )}
                  {currentSession.status === 'CLOSED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => draftMutation.mutate(currentSession.id)}
                      disabled={draftMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Remettre en brouillon
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentSession.description && (
                <p className="text-sm text-slate-500 mb-4">{currentSession.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  Créée le {new Date(currentSession.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-1.5">
                  Mise à jour le {new Date(currentSession.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Critères</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {currentSession._count.criteria}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Évaluateurs</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {currentSession._count.evaluators}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Équipes</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {currentSession._count.teams}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Projets soumis</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {currentSession._count.projects}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Projets soumis</span>
                  <span className="text-sm font-medium">
                    {currentSession._count.projects} / {currentSession._count.teams} équipes
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${currentSession._count.teams > 0
                        ? Math.round((currentSession._count.projects / currentSession._count.teams) * 100)
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirm action dialog */}
      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'activate'
                ? 'Activer la session'
                : 'Terminer la session'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'activate'
                ? 'L\'activation de la session permettra aux évaluateurs et équipes de se connecter et d\'interagir. Les critères et la configuration ne pourront plus être modifiés.'
                : 'La clôture de la session arrêtera les évaluations et rendra les résultats visibles. Êtes-vous sûr de vouloir continuer ?'}
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
              onClick={handleConfirmedAction}
              disabled={activateMutation.isPending || closeMutation.isPending}
              className={confirmAction === 'close' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {(activateMutation.isPending || closeMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {confirmAction === 'activate' ? 'Activer' : 'Terminer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
