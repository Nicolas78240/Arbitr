'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Calendar,
  Users,
  Hash,
  User,
  Clock,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  Briefcase,
  TrendingUp,
  Wallet,
  UserCog,
  AlertTriangle,
  AlertCircle,
  Link2,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { api, type ApiError } from '@/lib/api-client';

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

interface ScoreRecord {
  id: string;
  criterionId: string;
  projectId: string;
  value: number | null;
  comment: string | null;
  submittedAt: string;
  updatedAt: string;
}

type MyScoresResponse = Record<string, ScoreRecord[]>;

interface ProjectDetail {
  id: string;
  sessionId: string;
  teamId: string;
  name: string;
  number: number;
  formData: Record<string, unknown>;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  team: { id: string; name: string };
}

// ------- Score Input Component (0-5 buttons + N/P) -------

// Special sentinel to distinguish "N/P" (null) from "not yet scored" (undefined)
const NP_SENTINEL = 'NP' as const;
type DraftScoreValue = number | typeof NP_SENTINEL;

function ScoreInput({
  value,
  isNP,
  onScoreChange,
  onNPChange,
  disabled,
}: {
  value: number | null;
  isNP: boolean;
  onScoreChange: (v: number) => void;
  onNPChange: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const isSelected = !isNP && value === v;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onScoreChange(v)}
            className={`w-9 h-9 rounded-md text-sm font-semibold transition-all border ${
              isSelected
                ? 'bg-green-600 text-white border-green-700 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {v}
          </button>
        );
      })}
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <button
        type="button"
        disabled={disabled}
        onClick={onNPChange}
        className={`px-3 h-9 rounded-md text-sm font-semibold transition-all border ${
          isNP
            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        N/P
      </button>
      {!isNP && value !== null && (
        <span className="ml-2 text-sm font-medium text-slate-600">
          {value}/5
        </span>
      )}
      {isNP && (
        <span className="ml-2 text-sm font-medium text-amber-600">
          Non pertinent
        </span>
      )}
    </div>
  );
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

// ------- Criterion Score Row -------

function CriterionScoreRow({
  criterion,
  value,
  isNP,
  onScoreChange,
  onNPChange,
  disabled,
}: {
  criterion: Criterion;
  value: number | null;
  isNP: boolean;
  onScoreChange: (v: number) => void;
  onNPChange: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-slate-900">{criterion.name}</span>
            <Badge variant="outline" className="text-xs">
              Poids: {criterion.weight}%
            </Badge>
          </div>
          {criterion.description && (
            <p className="text-sm text-slate-500">{criterion.description}</p>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ScoreInput
          value={value}
          isNP={isNP}
          onScoreChange={onScoreChange}
          onNPChange={onNPChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ------- Known form field keys -------

const KNOWN_FIELDS = new Set([
  'Porteur du pitch',
  'Manager / Sponsor',
  'Département',
  'Description du use case',
  'Bénéfices attendus',
  'Économies estimées (€/an)',
  'Temps gagné (heures/semaine)',
  'Nombre d\'utilisateurs impactés',
  'Délai de mise en production',
  'Budget estimé (€)',
  'ETP nécessaires',
  'Technologies envisagées',
  'Données nécessaires',
  'Dépendances & prérequis',
  'Risques identifiés',
  'Lien documentation',
]);

// ------- KPI Card Component -------

function KpiCard({ icon: Icon, label, value, className }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${className ?? 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ------- Form Data Display (Quantitative) -------

function FormDataDisplay({ formData }: { formData: Record<string, unknown> }) {
  const [risksExpanded, setRisksExpanded] = useState(false);

  const entries = Object.entries(formData);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic">
        Aucune donnée de formulaire soumise.
      </p>
    );
  }

  const get = (key: string): string => String(formData[key] ?? '');

  const pitcher = get('Porteur du pitch');
  const manager = get('Manager / Sponsor');
  const dept = get('Département');
  const description = get('Description du use case');
  const benefits = get('Bénéfices attendus');
  const savings = get('Économies estimées (€/an)');
  const timeGained = get('Temps gagné (heures/semaine)');
  const users = get('Nombre d\'utilisateurs impactés');
  const ttm = get('Délai de mise en production');
  const budget = get('Budget estimé (€)');
  const fte = get('ETP nécessaires');
  const tech = get('Technologies envisagées');
  const dataNeeded = get('Données nécessaires');
  const deps = get('Dépendances & prérequis');
  const risks = get('Risques identifiés');
  const docLink = get('Lien documentation');

  // Check if we have any of the known enriched fields
  const hasEnrichedData = pitcher || manager || savings || budget;

  // Collect unknown fields for generic fallback
  const unknownEntries = entries.filter(([key]) => !KNOWN_FIELDS.has(key));

  if (!hasEnrichedData) {
    // Fallback: render all fields generically
    return (
      <div className="space-y-4">
        {entries.map(([key, value]) => {
          const strValue = String(value ?? '');
          const isUrl =
            strValue.startsWith('http://') || strValue.startsWith('https://');
          const isLongText = strValue.length > 100;

          return (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {key}
              </label>
              {isUrl ? (
                <a
                  href={strValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 text-sm break-all"
                >
                  {strValue}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              ) : isLongText ? (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {strValue}
                </div>
              ) : (
                <p className="text-sm text-slate-900">{strValue || '—'}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Porteur */}
      {(pitcher || manager || dept) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Porteur</h4>
          <div className="space-y-2.5">
            {pitcher && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-100 flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{pitcher}</p>
                  <p className="text-xs text-slate-500">Porteur du pitch</p>
                </div>
              </div>
            )}
            {manager && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-100 flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{manager}</p>
                  <p className="text-xs text-slate-500">Manager / Sponsor</p>
                </div>
              </div>
            )}
            {dept && (
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 flex-shrink-0">
                  <Building2 className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{dept}</p>
                  <p className="text-xs text-slate-500">Département</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Le Projet */}
      {(description || benefits) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Le Projet</h4>
          {description && (
            <div className="mb-3">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {description}
              </div>
            </div>
          )}
          {benefits && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bénéfices attendus</label>
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800 whitespace-pre-wrap leading-relaxed">
                {benefits}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Chiffres clés */}
      {(savings || timeGained || users || ttm || budget || fte) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chiffres clés</h4>
          <div className="grid grid-cols-2 gap-2">
            {savings && (
              <KpiCard
                icon={TrendingUp}
                label="Économies estimées"
                value={savings}
                className="bg-green-50 border-green-200"
              />
            )}
            {timeGained && (
              <KpiCard icon={Clock} label="Temps gagné" value={timeGained} />
            )}
            {users && (
              <KpiCard icon={Users} label="Utilisateurs impactés" value={users} />
            )}
            {ttm && (
              <KpiCard icon={Calendar} label="Délai mise en prod" value={ttm} />
            )}
            {budget && (
              <KpiCard icon={Wallet} label="Budget estimé" value={budget} />
            )}
            {fte && (
              <KpiCard icon={UserCog} label="ETP nécessaires" value={fte} />
            )}
          </div>
        </div>
      )}

      {/* Section 4: Technique */}
      {(tech || dataNeeded) && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Technique</h4>
          {tech && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">Technologies</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tech.split(',').map((t) => (
                  <Badge
                    key={t.trim()}
                    variant="outline"
                    className="text-xs bg-white text-slate-700 border-slate-300"
                  >
                    {t.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {dataNeeded && (
            <div>
              <div className="flex items-center gap-1 mb-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">Données nécessaires</p>
              </div>
              <p className="text-sm text-slate-700 pl-5">{dataNeeded}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 5: Risques & Dépendances */}
      {(deps || risks) && (
        <div>
          <button
            type="button"
            onClick={() => setRisksExpanded(!risksExpanded)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors w-full"
          >
            Risques & Dépendances
            {risksExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {risksExpanded && (
            <div className="mt-3 space-y-3">
              {deps && (
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Link2 className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs text-slate-500 font-medium">Dépendances & prérequis</p>
                  </div>
                  <p className="text-sm text-slate-700 pl-5">{deps}</p>
                </div>
              )}
              {risks && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-xs text-amber-700 font-medium">Risques identifiés</p>
                  </div>
                  <p className="text-sm text-amber-800">{risks}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 6: Documentation link */}
      {docLink && (
        <div>
          <a
            href={docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
          >
            <ExternalLink className="w-4 h-4" />
            Documentation
          </a>
        </div>
      )}

      {/* Generic fallback for unknown fields */}
      {unknownEntries.length > 0 && (
        <div className="border-t border-slate-200 pt-4 space-y-3">
          {unknownEntries.map(([key, value]) => {
            const strValue = String(value ?? '');
            const isUrl =
              strValue.startsWith('http://') || strValue.startsWith('https://');
            const isLongText = strValue.length > 100;

            return (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {key}
                </label>
                {isUrl ? (
                  <a
                    href={strValue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 text-sm break-all"
                  >
                    {strValue}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : isLongText ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {strValue}
                  </div>
                ) : (
                  <p className="text-sm text-slate-900">{strValue || '—'}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------- Main Page Component -------

export default function ProjectScoringPage() {
  const params = useParams<{ sessionId: string; projectId: string }>();
  const sessionId = params.sessionId;
  const projectId = params.projectId;
  const router = useRouter();
  const queryClient = useQueryClient();

  // DraftScoreValue: number = scored 0-5, 'NP' = Non Pertinent (will send null)
  const [draftScores, setDraftScores] = useState<Record<string, DraftScoreValue>>({});
  const [scoresInitialized, setScoresInitialized] = useState(false);

  // Track saved scores to detect unsaved changes
  const savedScoresRef = useRef<Record<string, DraftScoreValue>>({});

  // Fetch evaluator progress (contains criteria and project list)
  const {
    data: progress,
    isLoading: progressLoading,
    error: progressError,
  } = useQuery<MyProgressResponse>({
    queryKey: ['my-progress', sessionId],
    queryFn: () => api.get<MyProgressResponse>(`/sessions/${sessionId}/my-progress`),
  });

  // Fetch project details (contains formData)
  const {
    data: projectDetail,
    isLoading: projectLoading,
  } = useQuery<ProjectDetail>({
    queryKey: ['project-detail', sessionId, projectId],
    queryFn: () =>
      api.get<ProjectDetail>(`/sessions/${sessionId}/projects/${projectId}`),
  });

  // Fetch all my scores for the session
  const { data: myScores } = useQuery<MyScoresResponse>({
    queryKey: ['my-scores', sessionId],
    queryFn: () => api.get<MyScoresResponse>(`/sessions/${sessionId}/scores/mine`),
  });

  // Initialize draft scores from existing scores once loaded
  if (myScores && !scoresInitialized) {
    const existing = myScores[projectId] || [];
    const filled: Record<string, DraftScoreValue> = {};
    for (const score of existing) {
      // A Score record with value=null means N/P (deliberate abstention)
      filled[score.criterionId] = score.value === null ? NP_SENTINEL : score.value;
    }
    setDraftScores(filled);
    savedScoresRef.current = { ...filled };
    setScoresInitialized(true);
  }

  // Detect unsaved changes by comparing draft scores vs saved scores
  const hasUnsavedChanges = useMemo(() => {
    if (!scoresInitialized) return false;
    const saved = savedScoresRef.current;
    const draftKeys = Object.keys(draftScores);
    const savedKeys = Object.keys(saved);
    // If different number of scored criteria, there are changes
    if (draftKeys.length !== savedKeys.length) return true;
    // Compare each value
    for (const key of draftKeys) {
      if (draftScores[key] !== saved[key]) return true;
    }
    return false;
  }, [draftScores, scoresInitialized]);

  // beforeunload warning when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Find current project index for prev/next navigation
  const currentProjectIndex = useMemo(() => {
    if (!progress) return -1;
    return progress.projects.findIndex((p) => p.projectId === projectId);
  }, [progress, projectId]);

  const prevProject = useMemo(() => {
    if (!progress || currentProjectIndex <= 0) return null;
    return progress.projects[currentProjectIndex - 1];
  }, [progress, currentProjectIndex]);

  const nextProject = useMemo(() => {
    if (!progress || currentProjectIndex < 0 || currentProjectIndex >= progress.projects.length - 1)
      return null;
    return progress.projects[currentProjectIndex + 1];
  }, [progress, currentProjectIndex]);

  // Group criteria by axis
  const xCriteria = useMemo(
    () => (progress?.criteria ?? []).filter((c) => c.axis === 'X'),
    [progress],
  );
  const yCriteria = useMemo(
    () => (progress?.criteria ?? []).filter((c) => c.axis === 'Y'),
    [progress],
  );

  // Bulk score mutation
  const bulkScoreMutation = useMutation({
    mutationFn: (payload: {
      projectId: string;
      scores: Array<{ criterionId: string; value: number | null }>;
    }) => api.post(`/sessions/${sessionId}/scores/bulk`, payload),
    onSuccess: () => {
      toast.success('Scores enregistrés avec succès');
      queryClient.invalidateQueries({ queryKey: ['my-progress', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['my-scores', sessionId] });
      router.push(`/evaluate/${sessionId}`);
    },
    onError: (err: ApiError) => {
      toast.error(err?.message || "Erreur lors de l'enregistrement des scores");
    },
  });

  // Update a draft score (number clears N/P)
  const handleScoreChange = useCallback((criterionId: string, value: number) => {
    setDraftScores((prev) => ({ ...prev, [criterionId]: value }));
  }, []);

  // Toggle N/P for a criterion (clears numeric score)
  const handleNPChange = useCallback((criterionId: string) => {
    setDraftScores((prev) => ({ ...prev, [criterionId]: NP_SENTINEL }));
  }, []);

  // Submit scores
  const handleSubmitScores = useCallback(() => {
    if (!progress) return;

    // Check all criteria are filled (either a number or N/P)
    const missing = progress.criteria.filter((c) => draftScores[c.id] === undefined);
    if (missing.length > 0) {
      toast.error('Veuillez noter tous les critères avant de sauvegarder');
      return;
    }

    const scores = progress.criteria.map((c) => ({
      criterionId: c.id,
      value: draftScores[c.id] === NP_SENTINEL ? null : (draftScores[c.id] as number),
    }));

    bulkScoreMutation.mutate({ projectId, scores });
  }, [progress, draftScores, projectId, bulkScoreMutation]);

  // How many criteria are filled in the draft
  const draftFilledCount = progress
    ? progress.criteria.filter((c) => draftScores[c.id] !== undefined).length
    : 0;
  const totalCriteria = progress?.criteria.length ?? 0;
  const allCriteriaFilled = totalCriteria > 0 && draftFilledCount === totalCriteria;

  // Navigate to a different project
  const navigateToProject = useCallback(
    (project: ProjectProgress) => {
      setScoresInitialized(false);
      setDraftScores({});
      router.push(`/evaluate/${sessionId}/project/${project.projectId}`);
    },
    [router, sessionId],
  );

  // Loading state
  if (progressLoading || projectLoading) {
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
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => router.push(`/evaluate/${sessionId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProject = progress.projects.find((p) => p.projectId === projectId);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/evaluate/${sessionId}`)}
          className="text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux projets
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevProject}
            onClick={() => prevProject && navigateToProject(prevProject)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>
          <span className="text-sm text-slate-500 px-2">
            {currentProjectIndex + 1} / {progress.projects.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextProject}
            onClick={() => nextProject && navigateToProject(nextProject)}
          >
            Suivant
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Project Information (40%) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-900 text-white text-sm px-3 py-1">
                  <Hash className="w-3 h-3 mr-1" />
                  {projectDetail?.number ?? currentProject?.projectNumber}
                </Badge>
                <CardTitle className="text-xl">
                  {projectDetail?.name ?? currentProject?.projectName}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team name */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                <span className="font-medium">
                  {projectDetail?.team.name ?? currentProject?.teamName}
                </span>
              </div>

              {/* Submitted date */}
              {projectDetail?.submittedAt && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Soumis le{' '}
                    {new Date(projectDetail.submittedAt).toLocaleDateString(
                      'fr-FR',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>
              )}

              {/* File attachment */}
              {projectDetail?.fileUrl && (
                <div>
                  <a
                    href={projectDetail.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    <FileText className="w-4 h-4" />
                    {projectDetail.fileName || 'Fichier joint'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Data Card */}
          {projectDetail?.formData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Données du projet</CardTitle>
              </CardHeader>
              <CardContent>
                <FormDataDisplay
                  formData={projectDetail.formData as Record<string, unknown>}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Scoring (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Session context */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">
                  {progress.sessionName}
                </h2>
                <Badge
                  className={
                    allCriteriaFilled
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-blue-100 text-blue-700 border-blue-200'
                  }
                >
                  {draftFilledCount}/{totalCriteria} critères notés
                </Badge>
              </div>
              <ProgressBar scored={draftFilledCount} total={totalCriteria} />
            </CardContent>
          </Card>

          {/* X Axis criteria */}
          {xCriteria.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {progress.axisLabelX || 'Axe X'} — {xCriteria.length} critère
                {xCriteria.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-3">
                {xCriteria.map((criterion) => {
                  const draft = draftScores[criterion.id];
                  const isNP = draft === NP_SENTINEL;
                  const numericValue = typeof draft === 'number' ? draft : null;
                  return (
                    <CriterionScoreRow
                      key={criterion.id}
                      criterion={criterion}
                      value={numericValue}
                      isNP={isNP}
                      onScoreChange={(v) => handleScoreChange(criterion.id, v)}
                      onNPChange={() => handleNPChange(criterion.id)}
                      disabled={bulkScoreMutation.isPending}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Y Axis criteria */}
          {yCriteria.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {progress.axisLabelY || 'Axe Y'} — {yCriteria.length} critère
                {yCriteria.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-3">
                {yCriteria.map((criterion) => {
                  const draft = draftScores[criterion.id];
                  const isNP = draft === NP_SENTINEL;
                  const numericValue = typeof draft === 'number' ? draft : null;
                  return (
                    <CriterionScoreRow
                      key={criterion.id}
                      criterion={criterion}
                      value={numericValue}
                      isNP={isNP}
                      onScoreChange={(v) => handleScoreChange(criterion.id, v)}
                      onNPChange={() => handleNPChange(criterion.id)}
                      disabled={bulkScoreMutation.isPending}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky save footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 rounded-lg shadow-lg p-4 -mx-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">
                  {draftFilledCount}/{totalCriteria} critères notés
                </p>
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Modifications non enregistrées
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/evaluate/${sessionId}`)}
                  disabled={bulkScoreMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmitScores}
                  disabled={!allCriteriaFilled || bulkScoreMutation.isPending}
                >
                  {bulkScoreMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer les notes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
