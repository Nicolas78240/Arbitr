'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Info, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, type ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Label,
} from 'recharts';

// ------- Types -------

interface QuadrantInfo {
  label: string;
  icon: string;
  color: string;
}

interface RankedProject {
  projectId: string;
  projectName: string;
  teamName: string;
  number: number;
  scoreX: number;
  scoreY: number;
  scoreGlobal: number;
  quadrant: string;
  evaluatorCount: number;
  rank: number;
  scores: Record<string, number>;
}

interface SessionInfo {
  id: string;
  name: string;
  status: string;
  axisLabelX: string;
  axisLabelY: string;
  thresholdX: number;
  thresholdY: number;
  labelProject: string;
  labelTeam: string;
}

interface ResultsData {
  session: SessionInfo;
  quadrants: Record<string, QuadrantInfo>;
  criteria: Array<{ id: string; name: string; axis: string; weight: number }>;
  ranking: RankedProject[];
}

// ------- Quadrant Helpers -------

const DEFAULT_QUADRANT_COLORS: Record<string, string> = {
  'top-right': '#22c55e',
  'top-left': '#f59e0b',
  'bottom-right': '#3b82f6',
  'bottom-left': '#ef4444',
};

const DEFAULT_QUADRANT_LABELS: Record<string, string> = {
  'top-right': 'Stars',
  'top-left': 'Question Marks',
  'bottom-right': 'Cash Cows',
  'bottom-left': 'Dogs',
};

function getQuadrantColor(quadrant: string, quadrants: Record<string, QuadrantInfo>): string {
  return quadrants[quadrant]?.color || DEFAULT_QUADRANT_COLORS[quadrant] || '#6b7280';
}

function getQuadrantLabel(quadrant: string, quadrants: Record<string, QuadrantInfo>): string {
  return quadrants[quadrant]?.label || DEFAULT_QUADRANT_LABELS[quadrant] || quadrant;
}

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(107, 114, 128, ${opacity})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ------- Custom Tooltip -------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RankedProject }>;
  session?: SessionInfo;
  quadrants?: Record<string, QuadrantInfo>;
}

function CustomTooltip({ active, payload, session, quadrants }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-900">{data.projectName}</p>
      <p className="text-slate-500">{data.teamName}</p>
      <div className="mt-1 space-y-0.5">
        <p>{session?.axisLabelX || 'Axe X'}: <span className="font-medium">{data.scoreX.toFixed(2)}</span></p>
        <p>{session?.axisLabelY || 'Axe Y'}: <span className="font-medium">{data.scoreY.toFixed(2)}</span></p>
        <p>Score global: <span className="font-medium">{data.scoreGlobal.toFixed(2)}</span></p>
      </div>
      {quadrants && (
        <div className="mt-1 pt-1 border-t border-slate-100">
          <Badge
            className="text-white text-xs border-0"
            style={{ backgroundColor: getQuadrantColor(data.quadrant, quadrants) }}
          >
            {getQuadrantLabel(data.quadrant, quadrants)}
          </Badge>
        </div>
      )}
    </div>
  );
}

// ------- Custom Dot -------

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: RankedProject;
  quadrants: Record<string, QuadrantInfo>;
}

function CustomDot({ cx, cy, payload, quadrants }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  const color = getQuadrantColor(payload.quadrant, quadrants);
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} stroke="#fff" strokeWidth={2} />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fill="#334155"
        fontSize={11}
        fontWeight={600}
      >
        {payload.projectName}
      </text>
    </g>
  );
}

// ------- Main Page Component -------

export default function EvaluatorLiveResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const {
    data,
    isLoading,
    error,
  } = useQuery<ResultsData>({
    queryKey: ['evaluator-live-results', sessionId],
    queryFn: () => api.get<ResultsData>(`/sessions/${sessionId}/results`),
    refetchInterval: 30000,
  });

  const handleExportCsv = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const { accessToken } = useAuthStore.getState();
      const response = await fetch(`${apiUrl}/sessions/${sessionId}/results/export`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Export impossible' }));
        toast.error((err as ApiError).message || 'Export impossible');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultats-${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Info className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 text-lg mb-2">
              Impossible de charger les résultats
            </p>
            <p className="text-slate-400 mb-6">
              {(error as unknown as Record<string, string>)?.message || 'Une erreur est survenue lors du chargement des résultats.'}
            </p>
            <Link href={`/evaluate/${sessionId}`}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux évaluations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { session, quadrants, ranking } = data;

  const topRightColor = getQuadrantColor('top-right', quadrants);
  const topLeftColor = getQuadrantColor('top-left', quadrants);
  const bottomRightColor = getQuadrantColor('bottom-right', quadrants);
  const bottomLeftColor = getQuadrantColor('bottom-left', quadrants);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Résultats en direct — {session.name}
          </h1>
          {ranking.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" />
              Télécharger CSV
            </Button>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            Ces résultats évoluent au fur et à mesure des évaluations. Les scores affichés
            sont des moyennes basées sur les évaluations déjà soumises.
          </p>
        </div>
      </div>

      {/* Scatter Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Matrice de positionnement</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <div className="text-center py-12">
              <Info className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">
                Aucun score soumis pour le moment. Les résultats apparaîtront ici au fur et à mesure des évaluations.
              </p>
            </div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
                  {/* Quadrant background zones */}
                  <ReferenceArea
                    x1={1}
                    x2={session.thresholdX}
                    y1={session.thresholdY}
                    y2={5}
                    fill={hexToRgba(topLeftColor, 0.08)}
                    strokeOpacity={0}
                  />
                  <ReferenceArea
                    x1={session.thresholdX}
                    x2={5}
                    y1={session.thresholdY}
                    y2={5}
                    fill={hexToRgba(topRightColor, 0.08)}
                    strokeOpacity={0}
                  />
                  <ReferenceArea
                    x1={1}
                    x2={session.thresholdX}
                    y1={1}
                    y2={session.thresholdY}
                    fill={hexToRgba(bottomLeftColor, 0.08)}
                    strokeOpacity={0}
                  />
                  <ReferenceArea
                    x1={session.thresholdX}
                    x2={5}
                    y1={1}
                    y2={session.thresholdY}
                    fill={hexToRgba(bottomRightColor, 0.08)}
                    strokeOpacity={0}
                  />

                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="scoreX"
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="#94a3b8"
                    fontSize={12}
                  >
                    <Label
                      value={session.axisLabelX}
                      position="bottom"
                      offset={20}
                      style={{ fill: '#475569', fontWeight: 600, fontSize: 14 }}
                    />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="scoreY"
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="#94a3b8"
                    fontSize={12}
                  >
                    <Label
                      value={session.axisLabelY}
                      angle={-90}
                      position="left"
                      offset={20}
                      style={{ fill: '#475569', fontWeight: 600, fontSize: 14 }}
                    />
                  </YAxis>
                  <ReferenceLine
                    x={session.thresholdX}
                    stroke="#94a3b8"
                    strokeDasharray="8 4"
                    strokeWidth={2}
                  />
                  <ReferenceLine
                    y={session.thresholdY}
                    stroke="#94a3b8"
                    strokeDasharray="8 4"
                    strokeWidth={2}
                  />
                  <Tooltip
                    content={<CustomTooltip session={session} quadrants={quadrants} />}
                    cursor={false}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Scatter
                    data={ranking}
                    shape={(props: any) => (
                      <CustomDot
                        cx={props.cx}
                        cy={props.cy}
                        payload={props.payload as RankedProject}
                        quadrants={quadrants}
                      />
                    )}
                  >
                    {ranking.map((project) => (
                      <Cell
                        key={project.projectId}
                        fill={getQuadrantColor(project.quadrant, quadrants)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quadrant Legend */}
      {ranking.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((position) => {
            const color = getQuadrantColor(position, quadrants);
            const label = getQuadrantLabel(position, quadrants);
            const icon = quadrants[position]?.icon;
            return (
              <div
                key={position}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: hexToRgba(color, 0.1) }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium" style={{ color }}>
                  {icon ? `${icon} ` : ''}{label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Table */}
      {ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Classement actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      {session.labelProject || 'Projet'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      {session.axisLabelX}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      {session.axisLabelY}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Quadrant
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((project) => (
                    <tr
                      key={project.projectId}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-slate-900">{project.projectName}</span>
                          <span className="text-slate-500 ml-2 text-xs">({project.teamName})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {project.scoreX.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {project.scoreY.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className="text-white border-0"
                          style={{ backgroundColor: getQuadrantColor(project.quadrant, quadrants) }}
                        >
                          {getQuadrantLabel(project.quadrant, quadrants)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back button */}
      <div className="flex justify-center pb-4">
        <Link href={`/evaluate/${sessionId}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux évaluations
          </Button>
        </Link>
      </div>
    </div>
  );
}
