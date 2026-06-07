# Checklist visite immobilière

Page statique pour remplir une visite immobilière sur téléphone, sauvegarder localement et exporter les notes après coup.

URL GitHub Pages prévue :

```text
https://quentinvg.github.io/visite-immo-checklist/
```

## Utilisation

1. Ouvrir la page avant la visite pour charger les fichiers.
2. Utiliser le `Mode rapide` si la visite est groupée ou trop courte : les 10 points bloquants passent avant le reste.
3. Remplir les étapes dans l'ordre ou utiliser le bouton `Étapes` si la visite ne suit pas le déroulé prévu.
4. Ouvrir `Photos` pour cocher les preuves à prendre pendant la visite.
5. Laisser les réponses s'enregistrer automatiquement dans `localStorage`.
6. À la fin, utiliser `Copier pour ChatGPT`, `Copier mail post-visite`, `Imprimer / PDF` ou `Télécharger sauvegarde JSON`.

## Décision

- Un champ `Bloquant immédiat ?` marqué oui stoppe la décision, même avec une bonne moyenne.
- Les champs critiques ou importants non remplis empêchent une offre ferme.
- Les notes sont volontairement exigeantes : un point flou doit être prouvé, pas rationalisé.
- L'impression PDF génère le rapport complet avec le mode rapide, les photos, les réponses et les notes.

## Limites

- Les données restent uniquement sur l'appareil et le navigateur utilisés.
- Il n'y a pas de compte, pas de serveur et pas de sauvegarde cloud.
- Le mode quasi hors-ligne fonctionne après un premier chargement réussi.
- Pour changer d'appareil, exporter le JSON ou copier le texte généré.

## Vérification locale

```bash
npm test
python -m http.server 4173
```

Puis ouvrir :

```text
http://127.0.0.1:4173/
```
