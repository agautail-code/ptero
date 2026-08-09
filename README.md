# Pterodactyl Dashboard

Dashboard custom en glassmorphism dark pour visualiser et gérer les serveurs d'un panel Pterodactyl via l'Application API (admin).

## Ce que ça fait

- Liste tous les serveurs (nom, statut, RAM/disque/CPU, owner, node)
- Recherche instantanée
- Suspendre / réactiver un serveur
- Relancer une réinstallation
- Supprimer un serveur
- Stats globales (total, actifs, suspendus, nombre de nodes)

## Ce que ça ne fait pas (limite de la clé Application API)

Start/stop/kill et la console en direct nécessitent une **Client API key** (`ptlc_...`), différente de la clé Application (`ptla_...`). Cette clé n'est pas incluse ici — si tu veux ces fonctionnalités plus tard, il faudra l'ajouter.

## Déploiement sur Render

1. Pousse ce dossier sur un repo GitHub (privé de préférence).
2. Sur Render : **New > Web Service**, connecte le repo.
3. Render détecte `render.yaml` automatiquement (sinon : Build command `npm install`, Start command `npm start`).
4. Dans **Environment**, ajoute :
   - `PANEL_URL` → l'URL de ton panel (ex: `http://185.248.33.53`), sans `/` à la fin
   - `PTERODACTYL_API_KEY` → ta clé Application API (**régénère-la avant**, l'ancienne a été partagée en clair)
   - `DASHBOARD_PASSWORD` → le mot de passe pour accéder au dashboard
   - `SESSION_SECRET` → généré automatiquement par Render si tu gardes `render.yaml`
5. Deploy. L'URL Render te donne accès à l'écran de login.

## En local

```bash
npm install
cp .env.example .env
# remplis .env
npm start
```
