import Link from 'next/link';
import { Shield, Star, Upload, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[30%] w-[450px] h-[450px] rounded-full bg-pink-600/15 blur-[120px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero */}
      <div className="relative container mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/60 backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          Plateforme de sélection collective de projets
        </div>

        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter leading-none mb-6">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Arbitr
          </span>
        </h1>

        <p className="text-lg text-white/40 max-w-md mx-auto mb-4">
          Évaluez. Scorez. Décidez — avec style.
        </p>

        <div className="flex items-center justify-center gap-2 text-white/20 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Système opérationnel
        </div>
      </div>

      {/* Portal cards */}
      <div className="relative container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Admin */}
          <Link href="/admin" className="group block">
            <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 transition-all duration-300 hover:border-purple-500/50 hover:bg-white/[0.06] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <div className="w-12 h-12 mb-6 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>

                <h2 className="text-xl font-bold mb-2 text-white group-hover:text-purple-300 transition-colors">
                  Admin
                </h2>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  Gérez les sessions, critères et configurez les paramètres de sélection.
                </p>

                <ul className="space-y-2 text-xs text-white/30">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-400" />Sessions & configuration</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-400" />Jurys & équipes</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-400" />Résultats & matrice</li>
                </ul>

                <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-purple-400 group-hover:gap-3 transition-all">
                  Accéder
                  <span className="text-lg">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Évaluateur */}
          <Link href="/evaluate" className="group block">
            <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 transition-all duration-300 hover:border-cyan-500/50 hover:bg-white/[0.06] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <div className="w-12 h-12 mb-6 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                  <Star className="w-6 h-6 text-cyan-400" />
                </div>

                <h2 className="text-xl font-bold mb-2 text-white group-hover:text-cyan-300 transition-colors">
                  Évaluateur
                </h2>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  Évaluez les projets de manière anonyme et objective selon les critères définis.
                </p>

                <ul className="space-y-2 text-xs text-white/30">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan-400" />Évaluation anonyme</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan-400" />Notation guidée</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan-400" />Sauvegarde auto</li>
                </ul>

                <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:gap-3 transition-all">
                  Accéder
                  <span className="text-lg">→</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Soumission */}
          <Link href="/submit" className="group block">
            <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8 transition-all duration-300 hover:border-pink-500/50 hover:bg-white/[0.06] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(236,72,153,0.15)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <div className="w-12 h-12 mb-6 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                  <Upload className="w-6 h-6 text-pink-400" />
                </div>

                <h2 className="text-xl font-bold mb-2 text-white group-hover:text-pink-300 transition-colors">
                  Soumission
                </h2>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  Soumettez votre projet et suivez son statut jusqu'à la clôture de la session.
                </p>

                <ul className="space-y-2 text-xs text-white/30">
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-pink-400" />Formulaire complet</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-pink-400" />Upload de documents</li>
                  <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-pink-400" />Suivi en temps réel</li>
                </ul>

                <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-pink-400 group-hover:gap-3 transition-all">
                  Accéder
                  <span className="text-lg">→</span>
                </div>
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8 text-center text-xs text-white/20">
        © 2026 Arbitr — Tous droits réservés
      </footer>
    </main>
  );
}
