# CI/CD Setup — GitHub Actions + GCP

## Secrets GitHub à configurer

Dans **Settings → Secrets and variables → Actions** du repo GitHub, ajoute ces secrets :

| Secret | Description |
|--------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Provider WIF (voir étape 2) |
| `GCP_SERVICE_ACCOUNT` | Email du service account GCP |
| `NEXT_PUBLIC_API_URL` | `https://arbitr-api-302282679184.europe-west1.run.app` |

---

## Étape 1 — Créer un Service Account GCP

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --project=arbitr-prod

# Droits nécessaires
gcloud projects add-iam-policy-binding arbitr-prod \
  --member="serviceAccount:github-actions@arbitr-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding arbitr-prod \
  --member="serviceAccount:github-actions@arbitr-prod.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding arbitr-prod \
  --member="serviceAccount:github-actions@arbitr-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Étape 2 — Configurer Workload Identity Federation (sans clé JSON)

```bash
# Créer le Workload Identity Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --project=arbitr-prod

# Créer le provider OIDC GitHub
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --workload-identity-pool=github-pool \
  --location=global \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='Nicolas78240/Arbitr'" \
  --project=arbitr-prod

# Autoriser le repo GitHub à impersonner le service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@arbitr-prod.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/302282679184/locations/global/workloadIdentityPools/github-pool/attribute.repository/Nicolas78240/Arbitr" \
  --project=arbitr-prod
```

## Étape 3 — Récupérer les valeurs pour les secrets GitHub

```bash
# GCP_WORKLOAD_IDENTITY_PROVIDER
gcloud iam workload-identity-pools providers describe github-provider \
  --workload-identity-pool=github-pool \
  --location=global \
  --project=arbitr-prod \
  --format="value(name)"

# GCP_SERVICE_ACCOUNT
echo "github-actions@arbitr-prod.iam.gserviceaccount.com"
```

---

## Comportement du pipeline

| Événement | CI (lint/typecheck/tests) | CD (build + deploy) |
|-----------|--------------------------|---------------------|
| Push sur `main` | ✅ | ✅ |
| Pull Request vers `main` | ✅ | ❌ |

### Ordre de deploy
1. `deploy-api` → build image `api:<sha>` → push → deploy Cloud Run
2. `deploy-web` (après API) → build image `web:<sha>` → push → deploy Cloud Run

Les images sont taguées avec le **SHA du commit** pour un historique propre.
