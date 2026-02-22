import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Target,
  Users,
  Grid3X3,
  BarChart,
  ClipboardList,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const sections = [
  {
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    title: 'Tableau de bord',
    description: 'Vue d\'ensemble de la session active, statut et actions rapides.',
    color: 'text-blue-600 bg-blue-100',
  },
  {
    href: '/admin/sessions',
    icon: FileText,
    title: 'Sessions',
    description: 'Créer et gérer les sessions d\'évaluation (brouillon, active, terminée).',
    color: 'text-indigo-600 bg-indigo-100',
  },
  {
    href: '/admin/criteria',
    icon: Target,
    title: 'Critères',
    description: 'Définir les critères de notation sur les axes X et Y avec leurs poids.',
    color: 'text-amber-600 bg-amber-100',
  },
  {
    href: '/admin/evaluators',
    icon: Users,
    title: 'Évaluateurs',
    description: 'Ajouter des évaluateurs et générer leurs codes d\'accès.',
    color: 'text-green-600 bg-green-100',
  },
  {
    href: '/admin/teams',
    icon: Users,
    title: 'Équipes',
    description: 'Gérer les équipes participantes et leurs codes de soumission.',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    href: '/admin/quadrants',
    icon: Grid3X3,
    title: 'Quadrants',
    description: 'Configurer les seuils et les libellés de la matrice de positionnement.',
    color: 'text-rose-600 bg-rose-100',
  },
  {
    href: '/admin/fields',
    icon: ClipboardList,
    title: 'Champs',
    description: 'Personnaliser les champs du formulaire de soumission des projets.',
    color: 'text-cyan-600 bg-cyan-100',
  },
  {
    href: '/admin/results',
    icon: BarChart,
    title: 'Résultats',
    description: 'Consulter la matrice, le classement et exporter les résultats en CSV.',
    color: 'text-orange-600 bg-orange-100',
  },
];

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Paramètres
        </h1>
        <p className="text-slate-600">
          Accédez rapidement à toutes les sections d&apos;administration de votre plateforme Arbitr.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-all hover:shadow-md hover:border-slate-300 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
