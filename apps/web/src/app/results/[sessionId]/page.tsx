'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Lock, Trophy } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface QuadrantInfo {
  label: string;
  icon: string;
  color: string;
}

interface CriterionInfo {
  id: string;
  name: string;
  axis: 'X' | 'Y';
  weight: number;
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
  criteria: CriterionInfo[];
  ranking: RankedProject[];
}

// Default quadrant colors when none configured
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

// Convert hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(107, 114, 128, ${opacity})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

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

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user, accessToken } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchResults() {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const response = await fetch(`${API_URL}/sessions/${sessionId}/results`, { headers });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ message: response.statusText }));
          if (response.status === 403) {
            setError('NOT_AVAILABLE');
          } else {
            setError(err.message || 'Failed to load results');
          }
          return;
        }
        const result: ResultsData = await response.json();
        setData(result);
      } catch {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [sessionId, accessToken]);

  const handleExportCsv = async () => {
    if (!accessToken) return;
    setExporting(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/results/export`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] || `resultats-${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des résultats...</span>
        </div>
      </div>
    );
  }

  if (error === 'NOT_AVAILABLE' || (!data && error)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b border-slate-200">
          <div className="container mx-auto px-4 py-4">
            <Link
              href="/results"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux sessions
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 text-center">
          <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Résultats non disponibles
          </h1>
          <p className="text-slate-600 max-w-md mx-auto">
            {error === 'NOT_AVAILABLE'
              ? "Les résultats seront disponibles une fois la session clôturée."
              : error}
          </p>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const { session, quadrants, ranking } = data;

  // Get quadrant colors for reference areas
  const topRightColor = getQuadrantColor('top-right', quadrants);
  const topLeftColor = getQuadrantColor('top-left', quadrants);
  const bottomRightColor = getQuadrantColor('bottom-right', quadrants);
  const bottomLeftColor = getQuadrantColor('bottom-left', quadrants);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/results"
            className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux sessions
          </Link>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exporter CSV
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Session Header */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {session.name}
            </h1>
            <p className="text-slate-500">
              {session.axisLabelX} / {session.axisLabelY} — {ranking.length} {session.labelProject?.toLowerCase() || 'projets'}
            </p>
          </div>
          <Badge
            className={
              session.status === 'CLOSED'
                ? 'bg-red-100 text-red-700 border-red-200'
                : session.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-slate-100 text-slate-700'
            }
          >
            {session.status === 'CLOSED' ? 'Terminée' : session.status === 'ACTIVE' ? 'Active' : 'Brouillon'}
          </Badge>
        </div>

        {/* Matrix Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Matrice de positionnement</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-slate-500 text-center py-12">
                Aucun projet à afficher.
              </p>
            ) : (
              <div className="w-full">
                <ResponsiveContainer width="100%" height={500}>
                  <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 40 }}>
                    {/* Color-coded background zones for each quadrant */}
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

        {/* Ranking Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Classement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                Aucun projet à classer.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{session.labelProject || 'Projet'}</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">{session.labelTeam || 'Équipe'}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">{session.axisLabelX}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">{session.axisLabelY}</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">Score global</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Quadrant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((project) => (
                      <tr
                        key={project.projectId}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className={
                            project.rank <= 3
                              ? 'inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-xs ' +
                                (project.rank === 1 ? 'bg-amber-500' : project.rank === 2 ? 'bg-slate-400' : 'bg-amber-700')
                              : 'text-slate-500 font-medium'
                          }>
                            {project.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{project.projectName}</td>
                        <td className="py-3 px-4 text-slate-600">{project.teamName}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">{project.scoreX.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">{project.scoreY.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">{project.scoreGlobal.toFixed(2)}</td>
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
