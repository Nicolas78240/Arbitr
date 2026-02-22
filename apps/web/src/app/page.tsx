import Link from 'next/link';
import { Shield, Star, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">
          Arbitr
        </h1>
        <p className="text-xl text-slate-600 mb-12">
          Plateforme de sélection collective de projets
        </p>
      </div>

      {/* Portal Cards */}
      <div className="container mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Admin Portal */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border-slate-200">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Portail Admin</CardTitle>
              <CardDescription className="mt-2">
                Gérez les sessions, les critères et configurez les paramètres de sélection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Créer et configurer des sessions</li>
                <li>• Définir les critères d'évaluation</li>
                <li>• Gérer les jurys et les équipes</li>
                <li>• Visualiser les résultats</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/admin">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Accéder au portail Admin
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Evaluator Portal */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border-slate-200">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Portail Évaluateur</CardTitle>
              <CardDescription className="mt-2">
                Évaluez les projets soumis de manière anonyme et objective
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Évaluation anonyme des projets</li>
                <li>• Notation selon les critères définis</li>
                <li>• Interface intuitive et guidée</li>
                <li>• Sauvegarde automatique</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/evaluate">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Accéder au portail Évaluateur
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Submitter Portal */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border-slate-200">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl">Portail Soumission</CardTitle>
              <CardDescription className="mt-2">
                Soumettez votre projet pour la sélection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Formulaire de soumission complet</li>
                <li>• Upload de documents</li>
                <li>• Suivi du statut de soumission</li>
                <li>• Modification jusqu'à la clôture</li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/submit">
                <Button className="w-full bg-amber-600 hover:bg-amber-700">
                  Accéder au portail Soumission
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-slate-600">
          <p>© 2026 Arbitr - Plateforme de sélection collective de projets</p>
        </div>
      </footer>
    </main>
  );
}
