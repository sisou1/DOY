# 🌅 Dawn Of You

**Dawn Of You** est un projet personnel inspiré du défunt jeu **Dawn of Kings**.  
L’objectif est de recréer un gameplay similaire — une carte stratégique où les joueurs interagissent via des villes, des héros et des ressources partagées — tout en construisant une base technique moderne et maintenable.

---

## ⚙️ Stack technique

| Côté | Technologie | Description |
|------|--------------|-------------|
| 🎮 **Front-end** | Vue 3 + TypeScript | Interface du jeu |
|  | PixiJS | Rendu 2D temps réel sur canvas |
| 🧠 **Back-end** | NestJS | API REST & logique serveur |
|  | Prisma ORM | ORM moderne pour PostgreSQL |
| 🗄️ **Base de données** | PostgreSQL (hébergé sur Clever Cloud) | Données joueurs, villes, héros |
| 🧰 **Outils** | Vite, npm, Postman | Développement et tests rapides |

---

## 🚀 Lancer le projet localement

### 🧠 Backend

```bash
cd server
npm install
npm run start:dev
```

Serveur NestJS disponible sur http://localhost:3000

### 🎮 Frontend

```bash
cd client
npm install
npm run dev
```
Front Vue disponible sur http://localhost:5173

## 🧩 Fonctionnalités (en cours)

 Backend NestJS connecté à PostgreSQL via Prisma

 CRUD utilisateur simple

 Gestion de la carte et des villes

 Connexion en temps réel (WebSocket)

 Interface PixiJS dynamique

 Système de héros et de conquête


### 💡 Projet éducatif et passionné :
Ce projet n’a aucune visée commerciale.
Il s’agit d’une réinterprétation personnelle du concept du jeu Dawn of Kings pour apprendre et expérimenter avec les technologies web modernes.
