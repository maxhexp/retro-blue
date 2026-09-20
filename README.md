# Retro Blue

Website for LACHSA’s student-run record label.

Public website: https://maxhexp.github.io/retro-blue/

## Editing and publishing

Page text is in `index.html`, visual styles in `src/style.css`, and interactions in `src/main.js`. Images and fonts live in `public/assets/`.

Changes pushed to `main` automatically build and publish through GitHub Actions. Check the repository’s Actions tab for deployment progress.

## Local development

Use Node.js 24, then run `npm ci` and `npm run dev`. Run `npm run build` to generate the static website in `dist/`.

Google Forms handles signup submissions. The 3D mascot loads its scene from Spline; those services remain separate from GitHub hosting. See `ASSETS.md` for the record illustrations.
