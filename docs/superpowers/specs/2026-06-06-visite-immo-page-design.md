# Visite Immo Checklist - Design

## Objectif

Créer une GitHub Page statique, gratuite et dédiée à une visite immobilière. La page doit permettre de remplir rapidement les informations importantes pendant la visite, sauvegarder automatiquement dans le navigateur, puis produire un export texte exploitable dans ChatGPT et un rapport imprimable en PDF.

Le produit doit rester critique, honnête et exigeant. Il ne doit pas rassurer artificiellement l'utilisateur ni l'aider à rationaliser un mauvais ressenti. Le principe directeur est : le bien doit convaincre l'utilisateur, pas l'inverse.

## Contexte Et Contraintes

- La page sera publique sur GitHub Pages, donc tout le contenu publié doit être anonymisé.
- Aucun prénom, aucune ville exacte, aucun nom d'organisme, aucune comparaison identifiable ne doit apparaître dans les textes embarqués.
- La page doit fonctionner gratuitement, sans serveur, sans compte, sans base de données et sans service externe.
- L'usage principal est mobile, pendant une visite, avec potentiellement une mauvaise connexion réseau.
- La page doit être rapide à utiliser : gros boutons, peu de texte visible à la fois, notes libres seulement là où elles servent vraiment la décision.
- La page doit rester exploitable après un chargement initial grâce à une sauvegarde locale et un cache simple.

## Non-Objectifs

- Pas de connexion utilisateur.
- Pas de sauvegarde cloud.
- Pas de partage automatique vers ChatGPT.
- Pas de génération PDF côté serveur.
- Pas de stockage de photos.
- Pas d'IA intégrée dans la page.
- Pas de checklist immobilière générique longue et molle : le contenu suit le déroulé défini pour cette visite.

## Approche Retenue

Construire une page statique autonome avec :

- `index.html` pour la structure et les sections de visite.
- `styles.css` pour une interface mobile-first lisible en extérieur.
- `app.js` pour la navigation, l'autosauvegarde, le scoring strict et les exports.
- `manifest.webmanifest` et un service worker simple pour un mode quasi hors-ligne après chargement initial.

La page sera publiée depuis un repo GitHub séparé nommé `visite-immo-checklist`. La future URL cible est `https://quentinvg.github.io/visite-immo-checklist/`.

## Parcours Utilisateur

L'utilisateur ouvre la page avant d'arriver sur place. L'écran d'accueil rappelle brièvement que le bien doit convaincre, puis propose de démarrer ou reprendre la visite.

Le parcours avance étape par étape, dans l'ordre exact du déroulé de visite :

0. Avant d'arriver.
1. En arrivant dans le lotissement.
2. Extérieur maison avant d'entrer, avec sous-parties façade/fissures, eau/gouttières/dalle, jardin/terrasse.
3. Entrée dans la maison.
4. Séjour et cuisine.
5. Garage, cellier et local technique, avec sous-parties garage puis chaudière/chauffage.
6. Escalier et étage.
7. Chambres, avec sous-parties chambre principale, chambre enfant, troisième chambre et test silence.
8. Salle de bain et WC.
9. Fenêtres, volets et isolation.
10. Questions administratives à poser à la fin.
11. En sortant de la visite.
12. Débrief immédiat avec l'accompagnant.
13. Scoring final.
14. Décision selon scénario.
15. Les 7 points à ne surtout pas oublier.

Chaque étape affiche une consigne courte, les champs à remplir, les questions à poser si nécessaire, puis les boutons précédent et suivant. Les grosses sections peuvent être découpées en sous-écrans pour garder 3 à 8 champs visibles à la fois, mais la numérotation et le contenu restent alignés sur les 15 sections d'origine. L'utilisateur peut revenir en arrière sans perdre les réponses.

Le parcours guidé reste le mode principal, mais la visite ne dépend pas d'un ordre réel parfait. Une navigation rapide doit permettre de sauter facilement vers n'importe quelle étape si le vendeur commence par le jardin, l'étage, le garage ou les questions administratives. Cette navigation prend la forme d'un bouton `Étapes` toujours accessible, ouvrant un sommaire compact avec :

- le numéro et le titre de chaque section ;
- un indicateur `vide`, `en cours` ou `rempli` ;
- un badge `critique` pour les sections qui peuvent bloquer la décision ;
- un retour immédiat à l'étape en cours.

Changer d'étape par le sommaire ne doit jamais effacer les réponses. La page doit aussi proposer un bouton `Reprendre où j'étais` pour revenir au dernier écran consulté.

## Contenu Et Anonymisation

Le contenu reprend le fond du déroulé fourni, mais remplace les éléments identifiants :

- Le prénom devient `ma fille`.
- La ville et le nom du bien deviennent `ce bien`.
- La comparaison localisée devient `l'autre bien`.
- Le vendeur ou organisme vendeur devient `le vendeur` ou `l'organisme vendeur`.
- Les montants et seuils utiles restent présents si nécessaires à la décision.

Le ton intégré dans l'outil doit rester ferme :

- "Ne rationalise pas un mauvais ressenti."
- "Un point flou n'est pas un point rassurant."
- "Un red flag technique ou juridique bloque la décision."
- "Pas d'offre orale sous pression."

## Types De Champs

La majorité des réponses utilisent des boutons larges :

- Oui / Non.
- Oui / Bof / Non.
- OK / Doute / Mauvais.
- Faible / Moyen / Fort.
- Bonne / Moyenne / Faible.
- Rassurante / Moyenne / Bof.
- Notes de 0 à 10.

Des champs texte libres sont visibles directement sur les points pertinents :

- Premier ressenti négatif.
- Bruit, voisinage et mitoyenneté.
- Fissures, façade et traces suspectes.
- Eau, gouttières, dalle et humidité.
- Jardin si l'extérieur change la décision.
- Odeur ou sensation de maison malsaine.
- Séjour, cuisine et test silence.
- Garage trop petit, humide ou décevant.
- Chaudière, entretien, pannes et factures.
- Chambres et calme.
- Salle de bain, VMC et humidité.
- Fenêtres, condensation et bruit.
- Clauses de vente.
- Charges ou règlement de lotissement.
- Diagnostics, sinistres et taxe foncière.
- Débrief avec l'accompagnant.
- Budget travaux estimé.
- Défauts que l'utilisateur pourrait minimiser.
- Red flags finaux.

Les points secondaires peuvent avoir une note optionnelle repliée pour éviter de ralentir la visite.

## Scoring Et Décision

La page calcule une moyenne finale sur les critères suivants :

- Quartier / ambiance.
- Calme / voisinage.
- Mitoyenneté.
- Humidité / eaux pluviales.
- État technique global.
- Chaudière / chauffage.
- Jardin / extérieur.
- Luminosité.
- Projection avec ma fille.
- Envie réelle d'y vivre.
- Préférence par rapport à l'autre bien.

La décision ne dépend pas seulement de la moyenne. Les règles dures passent avant :

- Moyenne supérieure à 8 et aucun red flag : offre possible.
- Moyenne entre 7 et 8 : temporiser et demander les documents.
- Moyenne inférieure à 7 : ne pas acheter.
- Voisinage inférieur à 7 : ne pas acheter.
- Humidité ou eau inférieur à 7 : ne pas acheter.
- Clauses floues : pas d'offre ferme.
- Charges floues : pas d'offre ferme.
- Préférence encore marquée pour l'autre bien : temporiser.

Les réponses `Doute`, `Mauvais`, `Non`, `fort`, ou les champs importants laissés vides sur les sujets critiques doivent apparaître en synthèse comme points à sécuriser.

## Synthèse Et Exports

L'écran final contient :

- Progression de remplissage.
- Moyenne finale.
- Verdict strict.
- Red flags détectés.
- Points flous à sécuriser.
- Documents à demander.
- Questions administratives non répondues.
- Notes libres importantes.
- Rappel des 7 points à ne pas oublier.

Le bouton `Copier pour ChatGPT` génère un texte structuré anonymisé qui commence par une instruction claire :

```text
Voici mes notes anonymisées de visite immobilière.
Sois critique, honnête et exigeant.
Ne me rassure pas artificiellement.
Dis-moi si je suis en train de minimiser un red flag.
Dis-moi si la décision devrait être bloquée, temporisée ou possible.
```

Le texte exporté inclut ensuite toutes les réponses, les notes, les red flags, les champs non remplis et le verdict calculé.

Le bouton `Imprimer / PDF` appelle l'impression du navigateur avec une feuille de style dédiée. L'utilisateur pourra choisir `Enregistrer en PDF`.

Le bouton `Télécharger sauvegarde JSON` sert de secours si l'utilisateur veut archiver ou transférer les données.

## Sauvegarde Et Mode Hors-Ligne

Chaque changement est sauvegardé dans `localStorage` sous une clé dédiée au projet. La page affiche un état simple : `Sauvegardé sur cet appareil`.

Le service worker met en cache les fichiers statiques principaux après le premier chargement :

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`

Si la connexion disparaît pendant la visite, la page déjà ouverte continue de fonctionner. La limite est explicite : la sauvegarde reste sur l'appareil utilisé.

## Erreurs Et Garde-Fous

Si le presse-papiers est indisponible, la page affiche l'export texte dans une zone sélectionnable.

Si `localStorage` échoue, la page avertit l'utilisateur que la sauvegarde automatique n'est pas fiable et recommande d'exporter régulièrement.

Si l'utilisateur tente de réinitialiser les données, une confirmation explicite est requise.

Les champs critiques non remplis ne bloquent pas techniquement la navigation, mais ils apparaissent fortement en synthèse comme `information manquante`.

## Design Visuel

L'interface doit être sobre, dense et pratique :

- Mobile-first.
- Boutons hauts et faciles à toucher.
- Contraste fort pour usage en extérieur.
- Barre de progression persistante.
- Navigation précédent / suivant stable.
- Bouton `Étapes` toujours accessible pour naviguer hors ordre pendant la visite.
- Sections critiques visuellement distinctes.
- Aucun texte marketing.
- Aucun élément décoratif inutile.

La version desktop doit fonctionner correctement, mais elle n'est pas prioritaire.

## Tests Et Vérification

La vérification doit couvrir :

- Ouverture locale de la page.
- Navigation complète entre les étapes.
- Navigation directe vers une étape hors ordre sans perte de données.
- Autosauvegarde après rechargement.
- Champs texte critiques conservés.
- Calcul de moyenne.
- Règles dures de décision.
- Export ChatGPT anonymisé.
- Export JSON valide.
- Impression avec style PDF lisible.
- Fonctionnement après activation du cache local.
- Absence de noms identifiants dans le contenu publié.

Une vérification visuelle mobile et desktop doit être faite avant livraison.

## Critères D'Acceptation

- La page est accessible gratuitement via GitHub Pages.
- La page ne contient aucune donnée personnelle ou localisée identifiable.
- L'utilisateur peut remplir la visite en avançant étape par étape.
- L'utilisateur peut sauter rapidement à une autre étape si la visite ne suit pas l'ordre prévu.
- Les points critiques ont des champs texte libres visibles ou très rapides à ouvrir.
- Les réponses sont conservées après rechargement.
- L'export ChatGPT est structuré, complet, anonymisé et exigeant.
- Le rapport peut être enregistré en PDF via l'impression navigateur.
- La synthèse ne masque pas les red flags derrière une bonne moyenne.
- Le repo est committé, poussé sur GitHub, et la branche publiée fournit une URL utilisable.
