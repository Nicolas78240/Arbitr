'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Info,
  Search,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

// ------- Types -------

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  axis: 'X' | 'Y';
  weight: number;
  order: number;
}

interface ProjectProgress {
  projectId: string;
  projectName: string;
  projectNumber: number;
  teamName: string;
  scoredCriteria: number;
  totalCriteria: number;
  completed: boolean;
}

interface MyProgressResponse {
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
  axisLabelX: string;
  axisLabelY: string;
  evaluatorId: string;
  totalProjects: number;
  completedProjects: number;
  criteria: Criterion[];
  projects: ProjectProgress[];
}

// ------- Progress Bar -------

function ProgressBar({ scored, total }: { scored: number; total: number }) {
  const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
        {scored}/{total}
      </span>
    </div>
  );
}

// ------- Filter types -------

type FilterTab = 'all' | 'todo' | 'done';

// ------- Main Page Component -------

export default function EvaluatorSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Fetch evaluator progress
  const {
    data: progress,
    isLoading: progressLoading,
    error: progressError,
  } = useQuery<MyProgressResponse>({
    queryKey: ['my-progress', sessionId],
    queryFn: () => api.get<MyProgressResponse>(`/sessions/${sessionId}/my-progress`),
  });

  // Compute filter counts
  const filterCounts = useMemo(() => {
    if (!progress) return { all: 0, todo: 0, done: 0 };
    const all = progress.projects.length;
    const done = progress.projects.filter((p) => p.completed).length;
    return { all, todo: all - done, done };
  }, [progress]);

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    if (!progress) return [];
    let projects = progress.projects;

    // Apply completion filter
    if (activeFilter === 'todo') {
      projects = projects.filter((p) => !p.completed);
    } else if (activeFilter === 'done') {
      projects = projects.filter((p) => p.completed);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      projects = projects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(query) ||
          p.teamName.toLowerCase().includes(query),
      );
    }

    return projects;
  }, [progress, activeFilter, searchQuery]);

  // Navigate to full-page scoring for a project
  const handleOpenScoring = (project: ProjectProgress) => {
    router.push(`/evaluate/${sessionId}/project/${project.projectId}`);
  };

  // Loading state
  if (progressLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Error state
  if (progressError || !progress) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">
              Impossible de charger les informations de la session. Vérifiez votre
              accès et réessayez.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session not active
  if (progress.sessionStatus !== 'ACTIVE') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Évaluation des Projets
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">
              {progress.sessionStatus === 'DRAFT'
                ? "Cette session n'est pas encore ouverte aux évaluations."
                : 'Cette session est terminée. Les évaluations ne sont plus possibles.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No projects
  if (progress.projects.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          Évaluation des Projets
        </h1>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Info className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">Aucun projet soumis</p>
            <p className="text-slate-400">
              Les équipes n'ont pas encore soumis de projets pour cette session.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {progress.sessionName}
        </h1>
        <p className="text-slate-600">
          Bienvenue {user?.name}. Évaluez chaque projet en attribuant une note de 0 à
          5 pour chaque critère, ou marquez-le comme non pertinent (N/P).
        </p>
      </div>

      {/* Overall progress */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Progression globale</h2>
            <Badge
              className={
                progress.completedProjects === progress.totalProjects
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }
            >
              {progress.completedProjects}/{progress.totalProjects} projets évalués
            </Badge>
          </div>
          <ProgressBar
            scored={progress.completedProjects}
            total={progress.totalProjects}
          />
        </CardContent>
      </Card>

      {/* Search and filter bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm pb-4 -mx-1 px-1">
        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher par nom de projet ou d'équipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2">
          {([
            { key: 'all' as FilterTab, label: 'Tous', count: filterCounts.all },
            { key: 'todo' as FilterTab, label: 'À évaluer', count: filterCounts.todo },
            { key: 'done' as FilterTab, label: 'Terminés', count: filterCounts.done },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === tab.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-8">
              <p className="text-slate-500">
                {searchQuery.trim()
                  ? 'Aucun projet ne correspond à votre recherche.'
                  : 'Aucun projet dans cette catégorie.'}
              </p>
            </CardContent>
          </Card>
        )}
        {filteredProjects.map((project) => (
          <Card
            key={project.projectId}
            className={`cursor-pointer transition-all hover:shadow-md ${
              project.completed
                ? 'border-green-200 bg-green-50/30'
                : 'hover:border-blue-200'
            }`}
            onClick={() => handleOpenScoring(project)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {project.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-slate-900 truncate">
                      #{project.projectNumber} — {project.projectName}
                    </h3>
                    {project.completed && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 flex-shrink-0">
                        Terminé
                      </Badge>
                    )}
                  </div>
                  <div className="ml-8">
                    <p className="text-sm text-slate-500 mb-2">
                      Équipe : {project.teamName}
                    </p>
                    <ProgressBar
                      scored={project.scoredCriteria}
                      total={project.totalCriteria}
                    />
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
