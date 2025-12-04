# 🌅 Dawn Of You

**Dawn Of You** est un projet personnel inspiré du défunt jeu **Dawn of Kings**.  
L’objectif est de recréer un gameplay similaire — une carte stratégique où les joueurs interagissent via des villes, des
héros et des ressources partagées — tout en construisant une base technique moderne et maintenable.

---

## ⚙️ Stack technique

| Côté                    | Technologie                           | Description                    |
|-------------------------|---------------------------------------|--------------------------------|
| 🎮 **Front-end**        | Vue 3 + TypeScript                    | Interface du jeu               |
|                         | PixiJS                                | Rendu 2D temps réel sur canvas |
| 🧠 **Back-end**         | NestJS                                | API REST & logique serveur     |
|                         | Prisma ORM                            | ORM moderne pour PostgreSQL    |
| 🗄️ **Base de données** | PostgreSQL (hébergé sur Clever Cloud) | Données joueurs, villes, héros |
| 🧰 **Outils**           | Vite, npm, Postman                    | Développement et tests rapides |

---

## 🚀 Lancer le projet localement

### 🧠 Backend

```bash
cd server
npm install
npm run start:dev
```

### 🧠 mettre a jour prisma

```bash
cd server
npx prisma generate
npx prisma db push --accept-data-loss
```

Serveur NestJS disponible sur http://localhost:3000

### 🎮 Frontend

```bash
cd client
npm install
npm run dev
```

Front Vue disponible sur http://localhost:5173

### ⚡ Lancer front et back en même temps

Si tu utilises le workspace global à la racine (DOY/package.json) :

```bash
npm install:all
npm run dev:all
```

Cette commande lancera simultanément le backend et le frontend dans le même terminal (ou dans deux processus) grâce à
concurrently.

### 💡 Projet éducatif et passionné :

Ce projet n’a aucune visée commerciale.
Il s’agit d’une réinterprétation personnelle du concept du jeu Dawn of Kings pour apprendre et expérimenter avec les
technologies web modernes.

## 🧩 Fonctionnalités (en cours)

Les batailles :

Faut lui dire de mettre l'attaquand d'un coté et l'autre de l'autre

Faut faire le visuel des combat, au moins un peut

récompense pour les victoires




TODO : 

fer a 0 mine de fer a 0

Moyen de lvl up hors cheat

Créer un Jira ou un truc similaire si qq1 rejoin le projet

Cookie de session pour rester connecter même après un F5 et moyen de logout

organiser le code mieux que ça surtout coté front, attention a game.service.ts

Auth mieux que ça c'est une cata
passer par Auth 0 si possible

tests unitaires si possible

Retirer les paquet avec des vulnérabilités

## Résumé simple du fonctionnement des combats

Un combat oppose toujours deux armées, chacune représentée par un héros (ou général). Chaque héros possède trois
caractéristiques : une valeur d’attaque, une valeur de défense et un nombre de troupes, qui sert de points de vie de
l’armée.

Quand un combat commence, il se déroule automatiquement, sans intervention du joueur. Les deux héros s’affrontent en
temps réel : leurs attaques se succèdent pendant plusieurs secondes, et à chaque échange chaque armée subit des pertes
en fonction de l’attaque ennemie et de sa propre défense. Le résultat n’est donc pas instantané : on voit clairement la
confrontation progresser, un peu comme un bras de fer où les deux forces s’opposent et s’usent mutuellement.

Le combat se poursuit jusqu’à ce qu’une des deux armées n’ait plus de troupes. Le héros encore debout est déclaré
vainqueur. Si plusieurs héros participent à la bataille, celui qui vient après prend alors immédiatement le relais, ce
qui renforce encore l’effet de bras de fer entre deux lignes d’unités qui s’enchaînent.


