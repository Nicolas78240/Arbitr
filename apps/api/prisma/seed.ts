import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { scoreData } from './score-data.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.score.deleteMany();
  await prisma.project.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.evaluator.deleteMany();
  await prisma.team.deleteMany();
  await prisma.quadrant.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // --- Session 1: Hackathon IA Club Med 2025 ---
  const session1 = await prisma.session.create({
    data: {
      name: 'Hackathon IA Club Med 2025',
      description: 'Sélection des use cases IA pour le Hackathon de la Guilde des Dev IA',
      status: 'ACTIVE',
      adminCode: await hash('admin'),
      thresholdX: 3.5,
      thresholdY: 3.5,
      axisLabelX: 'Valeur Business',
      axisLabelY: 'Maturité du Use Case',
      labelEvaluator: 'Juré',
      labelTeam: 'Équipe',
      labelProject: 'Use case',
    },
  });

  // Quadrants
  await prisma.quadrant.createMany({
    data: [
      { sessionId: session1.id, position: 'top-right', label: 'Priorité Hackathon', icon: '🏆', color: '#059669' },
      { sessionId: session1.id, position: 'bottom-right', label: 'Backlog projet', icon: '📋', color: '#3B82F6' },
      { sessionId: session1.id, position: 'top-left', label: 'Self-service', icon: '🔧', color: '#F59E0B' },
      { sessionId: session1.id, position: 'bottom-left', label: 'Hors priorité', icon: '⏸', color: '#94A3B8' },
    ],
  });

  // Criteria — Axis X: Valeur Business (sum = 100%)
  const criteriaXData = [
    { name: 'Impact métier', description: 'Pain point clair, prioritaire, concret', weight: 25, order: 1 },
    { name: 'Viabilité économique', description: 'ROI crédible et réaliste', weight: 20, order: 2 },
    { name: 'Automatisation', description: 'Automatisation bout en bout du processus', weight: 25, order: 3 },
    { name: 'Effet différenciant', description: 'Transformation visible, effet «whaou»', weight: 15, order: 4 },
    { name: 'Cohérence stratégique', description: 'Aligné avec les priorités Club Med', weight: 15, order: 5 },
  ];

  // Criteria — Axis Y: Maturité du Use Case (sum = 100%)
  const criteriaYData = [
    { name: 'Qualité du cadrage', description: 'Périmètre, objectifs, hypothèses définis', weight: 20, order: 1 },
    { name: 'Accessibilité données', description: 'Données identifiées, existantes, accessibles', weight: 25, order: 2 },
    { name: 'Maturité POC', description: 'Livrable concret réalisable en hackathon', weight: 25, order: 3 },
    { name: 'Scalabilité technique', description: 'Technologies mutualisables, industrialisables', weight: 15, order: 4 },
    { name: 'Confidentialité données', description: 'Enjeux confidentialité et RGPD maîtrisés', weight: 15, order: 5 },
  ];

  for (const c of criteriaXData) {
    await prisma.criterion.create({
      data: { sessionId: session1.id, axis: 'X', ...c },
    });
  }
  for (const c of criteriaYData) {
    await prisma.criterion.create({
      data: { sessionId: session1.id, axis: 'Y', ...c },
    });
  }

  // Evaluators (13 jurors — real names from Excel)
  const evaluators = [
    { code: 'eval1', name: 'Cédric Baillet' },
    { code: 'eval2', name: 'Nicolas Bresch' },
    { code: 'eval3', name: 'Quentin Briard' },
    { code: 'eval4', name: 'Nicolas Caussin' },
    { code: 'eval5', name: 'Amina Chaabane' },
    { code: 'eval6', name: 'Siddhartha Chatterjee' },
    { code: 'eval7', name: 'Julien Denis' },
    { code: 'eval8', name: 'Caroline Launois-Beaurain' },
    { code: 'eval9', name: 'Armelle Vimont Laurent' },
    { code: 'eval10', name: 'Sophie Parisot Bouelam' },
    { code: 'eval11', name: 'Franck Picabea' },
    { code: 'eval12', name: 'Yoann Spadavecchia' },
    { code: 'eval13', name: 'Richard Douville' },
  ];

  for (const e of evaluators) {
    await prisma.evaluator.create({
      data: { sessionId: session1.id, name: e.name, code: await hash(e.code) },
    });
  }

  // Teams — 16 real use cases from Excel
  const teams = [
    { name: 'LDAP Security', code: 'team1' },
    { name: 'Strategic Reporting', code: 'team2' },
    { name: 'GO Holidays', code: 'team3' },
    { name: 'Regulatory Watch', code: 'team4' },
    { name: 'Background Check', code: 'team5' },
    { name: 'Language Assessment', code: 'team6' },
    { name: 'Reception Email', code: 'team7' },
    { name: 'AD Program', code: 'team8' },
    { name: 'Intelligence Gateway', code: 'team9' },
    { name: 'Flight Schedule', code: 'team10' },
    { name: 'Automatic Refund', code: 'team11' },
    { name: 'PULSE', code: 'team12' },
    { name: 'Supplier Data Quality', code: 'team13' },
    { name: 'Catalog Management', code: 'team14' },
    { name: 'Finance Account', code: 'team15' },
    { name: 'Purchase Order', code: 'team16' },
  ];

  for (const t of teams) {
    await prisma.team.create({
      data: { sessionId: session1.id, name: t.name, code: await hash(t.code) },
    });
  }

  const teamRecords = await prisma.team.findMany({ where: { sessionId: session1.id } });

  // Form fields
  await prisma.formField.createMany({
    data: [
      { sessionId: session1.id, label: 'Porteur du pitch', type: 'TEXT', required: true, order: 1, placeholder: 'Prénom Nom' },
      { sessionId: session1.id, label: 'Manager / Sponsor', type: 'TEXT', required: true, order: 2, placeholder: 'Prénom Nom — Poste' },
      { sessionId: session1.id, label: 'Département', type: 'TEXT', required: true, order: 3, placeholder: 'Ex: DSI, RH, Marketing...' },
      { sessionId: session1.id, label: 'Description du use case', type: 'TEXTAREA', required: true, order: 4, placeholder: 'Décrivez le problème adressé et la solution proposée' },
      { sessionId: session1.id, label: 'Bénéfices attendus', type: 'TEXTAREA', required: true, order: 5, placeholder: 'Listez les bénéfices concrets (gain de temps, réduction d\'erreurs, etc.)' },
      { sessionId: session1.id, label: 'Économies estimées (€/an)', type: 'TEXT', required: true, order: 6, placeholder: 'Ex: 150 000 €/an' },
      { sessionId: session1.id, label: 'Temps gagné (heures/semaine)', type: 'TEXT', required: true, order: 7, placeholder: 'Ex: 40h/semaine' },
      { sessionId: session1.id, label: 'Nombre d\'utilisateurs impactés', type: 'NUMBER', required: true, order: 8, placeholder: 'Ex: 200' },
      { sessionId: session1.id, label: 'Délai de mise en production', type: 'TEXT', required: true, order: 9, placeholder: 'Ex: 3 mois, 6 semaines...' },
      { sessionId: session1.id, label: 'Budget estimé (€)', type: 'TEXT', required: true, order: 10, placeholder: 'Ex: 50 000 €' },
      { sessionId: session1.id, label: 'ETP nécessaires', type: 'TEXT', required: true, order: 11, placeholder: 'Ex: 2 devs + 1 data engineer pendant 3 mois' },
      { sessionId: session1.id, label: 'Technologies envisagées', type: 'TEXTAREA', required: true, order: 12, placeholder: 'Langages, frameworks, APIs, services cloud...' },
      { sessionId: session1.id, label: 'Données nécessaires', type: 'TEXTAREA', required: true, order: 13, placeholder: 'Sources de données, APIs, bases de données nécessaires' },
      { sessionId: session1.id, label: 'Dépendances & prérequis', type: 'TEXTAREA', required: false, order: 14, placeholder: 'Équipes, systèmes, accès nécessaires' },
      { sessionId: session1.id, label: 'Risques identifiés', type: 'TEXTAREA', required: false, order: 15, placeholder: 'Risques techniques, organisationnels, réglementaires' },
      { sessionId: session1.id, label: 'Lien documentation', type: 'URL', required: false, order: 16, placeholder: 'https://...' },
    ],
  });

  // Projects — 16 use cases with real quantitative data
  const projectData: {
    teamName: string; ucName: string; name: string;
    pitcher: string; manager: string; dept: string;
    desc: string; benefits: string; savings: string;
    timeGained: string; users: string; ttm: string;
    budget: string; fte: string; tech: string;
    data: string; deps: string; risks: string;
  }[] = [
    {
      teamName: 'LDAP Security', ucName: 'LDAP Security & ID Creation', name: 'LDAP Security & ID Creation',
      pitcher: 'Marc Lefèvre', manager: 'Jean-Marc Dupont — Directeur Sécurité IT', dept: 'IT Sécurité',
      desc: 'Détection automatique d\'anomalies dans les accès LDAP et création d\'identités sécurisées via ML. Analyse des patterns d\'accès anormaux et alertes temps réel.',
      benefits: 'Réduction de 80% des incidents de sécurité liés aux accès non autorisés. Détection proactive vs réactive.',
      savings: '120 000 €/an', timeGained: '15h/semaine', users: '200', ttm: '8 mois',
      budget: '180 000 €', fte: '2 devs + 1 data scientist pendant 8 mois',
      tech: 'Python, Scikit-learn, TensorFlow, Active Directory API, Elasticsearch',
      data: 'Logs LDAP (3 ans d\'historique), Active Directory, SIEM',
      deps: 'Équipe Infra, accès aux logs de prod, serveur GPU',
      risks: 'Faux positifs pouvant bloquer des accès légitimes. Données sensibles (logs d\'accès).',
    },
    {
      teamName: 'Strategic Reporting', ucName: 'Strategic Reporting', name: 'Automation for Strategic Reporting',
      pitcher: 'Sophie Martin', manager: 'Marie Lefort — Directrice Stratégie', dept: 'Direction Stratégie',
      desc: 'Génération automatique de rapports stratégiques consolidant les KPIs de l\'ensemble des BU via approche data-driven et LLM.',
      benefits: 'Rapports générés en 2h au lieu de 3 jours. Qualité et cohérence des analyses améliorées.',
      savings: '90 000 €/an', timeGained: '20h/semaine', users: '50', ttm: '10 mois',
      budget: '120 000 €', fte: '1 dev fullstack + 1 data analyst pendant 10 mois',
      tech: 'Python, LangChain, GPT-4, Power BI API, Azure',
      data: 'Data Warehouse (Snowflake), Power BI datasets, données financières',
      deps: 'Équipe Data, accès Snowflake, Power BI licences',
      risks: 'Qualité des données sources variable. Hallucinations LLM sur données financières.',
    },
    {
      teamName: 'GO Holidays', ucName: 'GO Holidays Perimeter Automation', name: 'GO Holidays Perimeter Automation',
      pitcher: 'Lucas Bernard', manager: 'Claire Dubois — DRH Opérations', dept: 'RH / Opérations',
      desc: 'Automatisation du périmètre des congés GO avec gestion intelligente des plannings et optimisation des remplacements.',
      benefits: 'Réduction de 60% du temps de planification. Meilleure couverture des postes en village.',
      savings: '200 000 €/an', timeGained: '35h/semaine', users: '2000', ttm: '5 mois',
      budget: '95 000 €', fte: '2 devs pendant 5 mois',
      tech: 'Python, OR-Tools, API SIRH, React',
      data: 'SIRH (plannings, contrats, disponibilités), historique des congés',
      deps: 'SIRH, API Planification, Équipe RH villages',
      risks: 'Résistance au changement des managers villages. Intégration SIRH complexe.',
    },
    {
      teamName: 'Regulatory Watch', ucName: 'Regulatory Watch', name: 'Regulatory Watch',
      pitcher: 'Anne-Claire Petit', manager: 'Pierre Martin — Directeur Juridique', dept: 'Juridique',
      desc: 'Monitoring automatisé des évolutions réglementaires impactant le tourisme international (70+ pays).',
      benefits: 'Veille exhaustive vs manuelle. Alertes en temps réel sur les changements critiques.',
      savings: '60 000 €/an', timeGained: '12h/semaine', users: '30', ttm: '4 mois',
      budget: '75 000 €', fte: '1 dev + 1 juriste pendant 4 mois',
      tech: 'NLP, RAG, Web Scraping, LangChain, Pinecone',
      data: 'Sources légales publiques (EUR-Lex, Légifrance), newsletters réglementaires',
      deps: 'Équipe Juridique, abonnements bases de données légales',
      risks: 'Faux négatifs sur évolutions réglementaires critiques. Multilingue complexe.',
    },
    {
      teamName: 'Background Check', ucName: 'Background Check', name: 'Background Check',
      pitcher: 'Thomas Roux', manager: 'Laurent Blanc — Directeur Recrutement', dept: 'RH',
      desc: 'Automatisation complète de la vérification des antécédents des candidats GO/GE : diplômes, casier, références.',
      benefits: 'Processus réduit de 5 jours à 4 heures. 100% des candidats vérifiés vs 60% actuellement.',
      savings: '250 000 €/an', timeGained: '50h/semaine', users: '5000', ttm: '6 mois',
      budget: '200 000 €', fte: '2 devs + 1 chef de projet pendant 6 mois',
      tech: 'Python, API vérification (Checkr, Certineo), ML, Node.js',
      data: 'Base candidats (ATS), API de vérification tierces',
      deps: 'API de vérification, SIRH, budget abonnements API',
      risks: 'Conformité RGPD sur données personnelles. Fiabilité des APIs tierces.',
    },
    {
      teamName: 'Language Assessment', ucName: 'Language Assessment', name: 'Language Assessment',
      pitcher: 'Émilie Duval', manager: 'Catherine Noir — Directrice Formation', dept: 'RH Formation',
      desc: 'Évaluation automatisée et standardisée du niveau linguistique des candidats (FR, EN, ES, DE, IT) via IA conversationnelle.',
      benefits: 'Évaluation en 15 min vs 45 min avec un humain. Disponible 24/7. Résultats standardisés.',
      savings: '180 000 €/an', timeGained: '25h/semaine', users: '5000', ttm: '9 mois',
      budget: '250 000 €', fte: '2 devs + 1 linguiste + 1 UX pendant 9 mois',
      tech: 'Whisper (STT), GPT-4, TTS, React Native, WebRTC',
      data: 'Corpus d\'évaluation linguistique, grilles CECR, enregistrements audio',
      deps: 'API OpenAI, infrastructure audio/vidéo, experts linguistiques',
      risks: 'Accents et dialectes mal reconnus. Coût API élevé à l\'échelle.',
    },
    {
      teamName: 'Reception Email', ucName: 'Reception Email', name: 'Reception Email',
      pitcher: 'Julie Moreau', manager: 'Sophie Durand — Directrice Ops Villages', dept: 'Opérations Villages',
      desc: 'Classification et routage intelligent des 10 000+ emails/jour reçus dans les villages. Réponses automatiques pour les demandes standards.',
      benefits: '70% des emails traités automatiquement. Temps de réponse moyen réduit de 24h à 2h.',
      savings: '350 000 €/an', timeGained: '80h/semaine', users: '10000', ttm: '3 mois',
      budget: '60 000 €', fte: '1 dev + 1 ops pendant 3 mois',
      tech: 'NLP, Classification (BERT fine-tuné), API Mail (Exchange), Python',
      data: 'Historique emails (2 ans), catégories existantes, templates de réponse',
      deps: 'Serveur mail Exchange, accès API, Équipe Ops Villages',
      risks: 'Emails mal classifiés impactant la satisfaction client. Langues multiples.',
    },
    {
      teamName: 'AD Program', ucName: 'A/D Program', name: 'A/D Program',
      pitcher: 'David Garcia', manager: 'François Lemaire — Directeur Opérations', dept: 'Opérations',
      desc: 'Gestion automatisée et optimisée des arrivées et départs dans les 70 villages Club Med.',
      benefits: 'Réduction de 40% des temps d\'attente à l\'arrivée. Meilleure allocation des ressources.',
      savings: '150 000 €/an', timeGained: '30h/semaine', users: '70', ttm: '10 mois',
      budget: '300 000 €', fte: '3 devs + 1 PO pendant 10 mois',
      tech: 'Python, Optimisation, API PMS (Opera), React, IoT',
      data: 'PMS (réservations, check-in/out), données transport, planning staff',
      deps: 'PMS Opera, API Transport, Équipe Ops villages',
      risks: 'Intégration PMS complexe. Connectivité intermittente dans certains villages.',
    },
    {
      teamName: 'Intelligence Gateway', ucName: 'Intelligence Gateway', name: 'Intelligence Gateway',
      pitcher: 'Nicolas Caussin', manager: 'Thomas Gris — Directeur Architecture', dept: 'DSI',
      desc: 'Gateway API centralisé pour fédérer et gouverner tous les services d\'IA de Club Med : authentification, rate limiting, monitoring, facturation interne.',
      benefits: 'Temps d\'intégration d\'un nouveau service IA réduit de 3 semaines à 2 jours. Vision consolidée de l\'usage IA.',
      savings: '300 000 €/an', timeGained: '40h/semaine', users: '500', ttm: '8 mois',
      budget: '400 000 €', fte: '3 devs + 1 architecte pendant 8 mois',
      tech: 'Kong/Tyk, Azure API Management, Prometheus, Grafana, Node.js',
      data: 'Catalogue APIs existantes, métriques d\'usage, contrats SLA',
      deps: 'Azure, toutes les équipes IA, budget infrastructure',
      risks: 'Point de défaillance unique. Latence ajoutée sur les appels.',
    },
    {
      teamName: 'Flight Schedule', ucName: 'Flight Schedule', name: 'Flight Schedule',
      pitcher: 'Stéphane Morel', manager: 'Isabelle Rouge — Directrice Transport', dept: 'Transport',
      desc: 'Optimisation des plannings de vols charter via algorithmes IA. Réduction des coûts de kérosène et amélioration du taux de remplissage.',
      benefits: '+5% taux de remplissage. -8% coût carburant. Planification en 1 jour vs 1 semaine.',
      savings: '2 500 000 €/an', timeGained: '60h/semaine', users: '30', ttm: '12 mois',
      budget: '500 000 €', fte: '2 devs + 1 data scientist + 1 expert métier pendant 12 mois',
      tech: 'Python, OR-Tools, ML (demand forecasting), API GDS (Amadeus)',
      data: 'Historique réservations (5 ans), données carburant, slots aéroport, météo',
      deps: 'GDS Amadeus, compagnies aériennes partenaires, Revenue Management',
      risks: 'Réglementation aérienne. Volatilité du prix carburant. Données historiques incomplètes.',
    },
    {
      teamName: 'Automatic Refund', ucName: 'Automatic Refund', name: 'Automatic Refund',
      pitcher: 'Caroline Launois', manager: 'Patrick Renaud — Directeur Finance Client', dept: 'Finance / Relation Client',
      desc: 'Automatisation du traitement de 15 000 remboursements/an : analyse de la demande, vérification des conditions, exécution du paiement.',
      benefits: 'Délai de remboursement réduit de 15 jours à 48h. Taux d\'erreur réduit de 12% à 1%.',
      savings: '180 000 €/an', timeGained: '45h/semaine', users: '15000', ttm: '5 mois',
      budget: '130 000 €', fte: '2 devs + 1 analyste pendant 5 mois',
      tech: 'RPA (UiPath), NLP, API Paiement (Stripe), Python',
      data: 'ERP (historique remboursements), CGV, API bancaires',
      deps: 'ERP, API Paiement Stripe, Équipe Relation Client',
      risks: 'Remboursements frauduleux non détectés. Réglementation financière.',
    },
    {
      teamName: 'PULSE', ucName: 'PULSE', name: 'PULSE - Satisfaction Client Temps Réel',
      pitcher: 'Alexandra Fontaine', manager: 'Christophe Vert — Directeur CX', dept: 'Marketing / CX',
      desc: 'Analyse du sentiment client en temps réel pendant le séjour via feedbacks multicanaux (app, email, bornes, réseaux sociaux).',
      benefits: 'Détection des insatisfactions en temps réel. NPS amélioré de +8 points. Intervention proactive des équipes.',
      savings: '500 000 €/an', timeGained: '20h/semaine', users: '1500000', ttm: '6 mois',
      budget: '350 000 €', fte: '2 devs + 1 data scientist + 1 UX pendant 6 mois',
      tech: 'NLP, Sentiment Analysis, Kafka, React, Python, ElasticSearch',
      data: 'Feedbacks app mobile, emails, réseaux sociaux, données CRM',
      deps: 'App mobile Club Med, CRM, Wi-Fi villages, Kafka',
      risks: 'Volume de données élevé en haute saison. Biais linguistique/culturel.',
    },
    {
      teamName: 'Supplier Data Quality', ucName: 'Supplier Data Quality', name: 'Supplier Data Quality',
      pitcher: 'Franck Picabea', manager: 'Anne Bleu — Directrice Achats', dept: 'Achats',
      desc: 'Nettoyage, dédoublonnage et enrichissement automatique de la base de 3 000 fournisseurs. Scoring qualité automatisé.',
      benefits: 'Base fournisseurs fiable à 99% vs 72% actuellement. Réduction de 90% des doublons.',
      savings: '400 000 €/an', timeGained: '15h/semaine', users: '50', ttm: '2 mois',
      budget: '40 000 €', fte: '1 dev + 1 data analyst pendant 2 mois',
      tech: 'Python, Record Linkage, API Enrichissement (D&B, Altares), dbt',
      data: 'Base fournisseurs ERP, données Dun & Bradstreet, SIRET/SIREN',
      deps: 'ERP Achats, abonnement D&B/Altares, Équipe Data',
      risks: 'Coût API d\'enrichissement. Faux positifs dans le dédoublonnage.',
    },
    {
      teamName: 'Catalog Management', ucName: 'Catalog Management', name: 'Catalog Management',
      pitcher: 'Mathieu Lambert', manager: 'Nathalie Rousseau — Directrice Produit', dept: 'Produit',
      desc: 'Catégorisation automatique et enrichissement des 500 produits du catalogue. Génération de descriptions multilingues.',
      benefits: 'Mise à jour du catalogue 5x plus rapide. Descriptions cohérentes dans 6 langues.',
      savings: '120 000 €/an', timeGained: '25h/semaine', users: '100', ttm: '7 mois',
      budget: '160 000 €', fte: '1 dev + 1 product manager pendant 7 mois',
      tech: 'NLP, GPT-4, Computer Vision, PIM API, Python',
      data: 'PIM (fiches produit), DAM (assets visuels), données tarifaires',
      deps: 'PIM, DAM, Équipe Produit, traducteurs pour validation',
      risks: 'Qualité des traductions automatiques. Cohérence de la marque.',
    },
    {
      teamName: 'Finance Account', ucName: 'Finance Account', name: 'Finance Account',
      pitcher: 'Olivier Dupuis', manager: 'Valérie Marchand — Directrice Comptabilité', dept: 'Finance',
      desc: 'Automatisation de la réconciliation comptable : rapprochement bancaire, lettrage automatique, détection d\'anomalies.',
      benefits: 'Clôture mensuelle réduite de 10 jours à 3 jours. 95% de lettrage automatique vs 40%.',
      savings: '280 000 €/an', timeGained: '50h/semaine', users: '80', ttm: '10 mois',
      budget: '350 000 €', fte: '2 devs + 1 comptable expert pendant 10 mois',
      tech: 'Python, ML (anomaly detection), SAP API, RPA',
      data: 'SAP (écritures comptables), relevés bancaires, référentiels comptables',
      deps: 'SAP, API Bancaires, Équipe Comptabilité, DSI',
      risks: 'Erreurs de rapprochement sur cas complexes. Audit trail réglementaire.',
    },
    {
      teamName: 'Purchase Order', ucName: 'Purchase Order', name: 'Purchase Order',
      pitcher: 'Antoine Mercier', manager: 'Philippe Blanc — Directeur Achats Opérationnels', dept: 'Achats',
      desc: 'Automatisation du processus de commandes d\'achat : extraction des besoins, matching fournisseurs, génération et approbation des bons de commande.',
      benefits: 'Cycle de commande réduit de 5 jours à 1 jour. Réduction des erreurs de saisie de 90%.',
      savings: '80 000 €/an', timeGained: '15h/semaine', users: '50', ttm: '14 mois',
      budget: '280 000 €', fte: '2 devs + 1 expert métier pendant 14 mois',
      tech: 'RPA, NLP, ERP API (SAP MM), Workflow engine',
      data: 'ERP (commandes, fournisseurs, contrats), emails de demande d\'achat',
      deps: 'SAP MM, Workflow approbation, Équipe Achats, DSI',
      risks: 'Intégration SAP MM lourde. Processus d\'approbation multi-niveaux complexe.',
    },
  ];

  const projects = [];
  for (let i = 0; i < projectData.length; i++) {
    const pd = projectData[i];
    const team = teamRecords.find(t => t.name === pd.teamName);
    if (!team) continue;
    const project = await prisma.project.create({
      data: {
        sessionId: session1.id,
        teamId: team.id,
        name: pd.name,
        number: i + 1,
        formData: {
          'Porteur du pitch': pd.pitcher,
          'Manager / Sponsor': pd.manager,
          'Département': pd.dept,
          'Description du use case': pd.desc,
          'Bénéfices attendus': pd.benefits,
          'Économies estimées (€/an)': pd.savings,
          'Temps gagné (heures/semaine)': pd.timeGained,
          'Nombre d\'utilisateurs impactés': pd.users,
          'Délai de mise en production': pd.ttm,
          'Budget estimé (€)': pd.budget,
          'ETP nécessaires': pd.fte,
          'Technologies envisagées': pd.tech,
          'Données nécessaires': pd.data,
          'Dépendances & prérequis': pd.deps,
          'Risques identifiés': pd.risks,
        },
      },
    });
    projects.push({ ...project, ucName: pd.ucName });
  }

  // --- Import real scores from Excel data ---
  const evaluatorRecords = await prisma.evaluator.findMany({ where: { sessionId: session1.id } });
  const criteriaRecords = await prisma.criterion.findMany({ where: { sessionId: session1.id }, orderBy: { order: 'asc' } });

  const evalNameToId: Record<string, string> = {};
  for (const e of evaluatorRecords) {
    evalNameToId[e.name] = e.id;
  }

  const critNameToId: Record<string, string> = {};
  for (const c of criteriaRecords) {
    critNameToId[c.name] = c.id;
  }

  const scoreEntries: { evaluatorId: string; projectId: string; criterionId: string; value: number }[] = [];

  for (const project of projects) {
    const ucScores = scoreData[project.ucName];
    if (!ucScores) {
      console.log(`  Warning: No score data for ${project.ucName}`);
      continue;
    }

    for (const [evalName, critScores] of Object.entries(ucScores)) {
      const evaluatorId = evalNameToId[evalName];
      if (!evaluatorId) continue;

      for (const [critName, value] of Object.entries(critScores)) {
        const criterionId = critNameToId[critName];
        if (!criterionId) continue;

        scoreEntries.push({ evaluatorId, projectId: project.id, criterionId, value });
      }
    }
  }

  await prisma.score.createMany({ data: scoreEntries });

  console.log(`  Projects created: ${projects.length}`);
  console.log(`  Scores imported: ${scoreEntries.length} (from real Excel jury data)`);

  // --- Session 2: Demo Session (generic) ---
  const session2 = await prisma.session.create({
    data: {
      name: 'Demo Session',
      description: 'A generic demo session for testing purposes',
      status: 'DRAFT',
      adminCode: await hash('admin'),
      thresholdX: 3.0,
      thresholdY: 3.0,
      axisLabelX: 'Impact',
      axisLabelY: 'Feasibility',
      labelEvaluator: 'Evaluator',
      labelTeam: 'Team',
      labelProject: 'Project',
    },
  });

  await prisma.quadrant.createMany({
    data: [
      { sessionId: session2.id, position: 'top-right', label: 'Go', icon: '🚀', color: '#059669' },
      { sessionId: session2.id, position: 'bottom-right', label: 'Plan', icon: '📅', color: '#3B82F6' },
      { sessionId: session2.id, position: 'top-left', label: 'Investigate', icon: '🔬', color: '#F59E0B' },
      { sessionId: session2.id, position: 'bottom-left', label: 'Drop', icon: '❌', color: '#94A3B8' },
    ],
  });

  await prisma.criterion.createMany({
    data: [
      { sessionId: session2.id, name: 'Business Value', axis: 'X', weight: 50, order: 1 },
      { sessionId: session2.id, name: 'User Demand', axis: 'X', weight: 50, order: 2 },
      { sessionId: session2.id, name: 'Technical Readiness', axis: 'Y', weight: 50, order: 1 },
      { sessionId: session2.id, name: 'Team Capacity', axis: 'Y', weight: 50, order: 2 },
    ],
  });

  for (const e of [{ code: 'EVAL01', name: 'Alice Demo' }, { code: 'EVAL02', name: 'Bob Demo' }]) {
    await prisma.evaluator.create({
      data: { sessionId: session2.id, name: e.name, code: await hash(e.code) },
    });
  }

  for (const t of [{ code: 'TEAM01', name: 'Alpha Team' }, { code: 'TEAM02', name: 'Beta Team' }]) {
    await prisma.team.create({
      data: { sessionId: session2.id, name: t.name, code: await hash(t.code) },
    });
  }

  console.log('Seed complete!');
  console.log(`  Session 1: ${session1.name} (${session1.id}) - ACTIVE`);
  console.log(`  Session 2: ${session2.name} (${session2.id}) - DRAFT`);
  console.log('');
  console.log('Admin code: admin');
  console.log('Evaluator codes: eval1..eval13');
  console.log('Team codes: team1..team16, TEAM01, TEAM02');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
