'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { api, type ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

interface SessionOption {
  id: string;
  name: string;
  status: string;
}

type Role = 'admin' | 'evaluator' | 'team';

interface LoginFormProps {
  role: Role;
  title: string;
  description: string;
  redirectTo: string;
}

export function LoginForm({
  role,
  title,
  description,
}: LoginFormProps) {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/sessions/public`)
      .then((res) => res.json())
      .then((data: SessionOption[]) => {
        // Admin sees all sessions; evaluators and teams only see ACTIVE ones
        const filtered = role === 'admin'
          ? data
          : data.filter((s) => s.status === 'ACTIVE');
        setSessions(filtered);
        if (filtered.length === 1) {
          setSessionId(filtered[0].id);
        }
      })
      .catch(() => toast.error('Impossible de charger les sessions'))
      .finally(() => setLoadingSessions(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = role === 'admin' ? '/auth/admin' :
                      role === 'evaluator' ? '/auth/evaluator' :
                      '/auth/team';

      const body = role === 'admin'
        ? { sessionId, adminCode: code }
        : role === 'evaluator'
        ? { sessionId, evaluatorCode: code }
        : { sessionId, teamCode: code };

      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
      }>(endpoint, body);

      setTokens(response.accessToken, response.refreshToken);

      toast.success('Connexion réussie');

      if (role === 'admin') {
        router.push('/admin/sessions');
      } else if (role === 'evaluator') {
        router.push(`/evaluate/${sessionId}`);
      } else {
        router.push(`/submit/${sessionId}`);
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      toast.error((error as ApiError).message || 'Erreur de connexion');
      setIsLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '🟢';
      case 'CLOSED': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionId">Session</Label>
            {loadingSessions ? (
              <div className="flex items-center space-x-2 text-sm text-slate-500 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Chargement des sessions...</span>
              </div>
            ) : (
              <select
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                required
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Sélectionnez une session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {statusLabel(s.status)} {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">
              {role === 'admin' ? 'Code admin' :
               role === 'evaluator' ? 'Code évaluateur' :
               'Code équipe'}
            </Label>
            <Input
              id="code"
              type="password"
              placeholder="Entrez votre code d'accès"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !sessionId || !code}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
