# 🎨 Autopic Studio for Visual Studio Code & Forks

**Interactive illustration studio for VS Code, Cursor, Windsurf & Google Antigravity IDE.**

Auto-palette brand detection • Multi-provider search (unDraw, Open Peeps, IRA Design) • Live SVG colorizer • 1-click cursor insertion.

---

## ⚡ Fonctionnalités Clés

- 🏛️ **Multi-Fournisseurs Intégrés** : Explorez instantanément les catalogues **unDraw** (Approved Open License), **Open Peeps** (CC0 Public Domain) et **IRA Design** (MIT License).
- 🎨 **Auto-Palette Synchronisée** : Détecte automatiquement la couleur primaire de votre projet (`tailwind.config.*`, variables CSS `--primary`) et recolore les vignettes SVG en direct sous vos yeux.
- 🎯 **Deux Modes d'Affichage** :
  - **Vue Sidebar (Activity Bar)** : Panneau compact à gauche pour une recherche et une insertion express sans quitter votre code.
  - **Studio Plein Écran** : Accessible via `Ctrl+Shift+P` -> `Autopic: Open Studio` pour naviguer confortablement dans une grande galerie visuelle.
- 🚀 **Insertion Intelligente au Curseur** : En un clic sur `Insérer au curseur` :
  1. Le SVG recoloré est sauvegardé dans `public/illustrations/<slug>.svg`.
  2. Le composant typé (React/Next.js) est généré dans `components/illustrations/<Name>.tsx`.
  3. L'import et la balise JSX sont insérés automatiquement à l'emplacement exact de votre curseur dans le fichier ouvert !

---

## 💻 Installation

### Depuis l'interface de votre IDE (VS Code, Cursor, Windsurf, Antigravity) :
1. Téléchargez le fichier `autopic-vscode-0.1.0.vsix`.
2. Ouvrez l'onglet **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Cliquez sur le menu `...` en haut à droite et sélectionnez **"Install from VSIX..."**.
4. Sélectionnez le fichier `autopic-vscode-0.1.0.vsix`.

### En ligne de commande :
```bash
# Pour VS Code
code --install-extension autopic-vscode-0.1.0.vsix

# Pour Cursor
cursor --install-extension autopic-vscode-0.1.0.vsix

# Pour Windsurf
windsurf --install-extension autopic-vscode-0.1.0.vsix
```

---

## 🛠️ Commandes

| Commande | Raccourci / Emplacement | Description |
|---|---|---|
| `autopic.openStudio` | `Ctrl+Shift+P` -> `Autopic: Open Studio` | Ouvre le grand studio d'illustration dans un onglet éditeur |
| `autopic.insertAtCursor` | Clic-droit dans l'éditeur -> `Autopic: Insert Illustration` | Recherche rapide et insertion directe au curseur |
| `autopic.refresh` | Barre de titre de la Sidebar | Ré-analyse la palette et le framework du projet |

---

## ⚖️ Licences & Conformité
Autopic Studio respecte rigoureusement le droit d'auteur :
- unDraw Open License (usage commercial & personnel libre sans attribution)
- CC0 1.0 Universal Pablo Stanley (domaine public)
- Creative Tim MIT License

---

*Développé avec passion par Tidjan Sow pour l'écosystème open-source.*
