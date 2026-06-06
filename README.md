# Checklist visite immobilière

Page statique pour remplir une visite immobilière sur téléphone, sauvegarder localement et exporter les notes après coup.

URL GitHub Pages prévue :

```text
https://quentinvg.github.io/visite-immo-checklist/
```

## Utilisation

1. Ouvrir la page avant la visite pour charger les fichiers.
2. Remplir les étapes dans l'ordre ou utiliser le bouton `Étapes` si la visite ne suit pas le déroulé prévu.
3. Laisser les réponses s'enregistrer automatiquement dans `localStorage`.
4. À la fin, utiliser `Copier pour ChatGPT`, `Imprimer / PDF` ou `Télécharger sauvegarde JSON`.

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
