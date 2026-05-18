# Dictator of Sweden

Ett socialt deduktions- och strategispel tematiserat på riksdagsvalet 2026.
Två spellägen i samma app:

- **Valrörelsen 2026** — partilag tävlar i en kampanjduell över Sveriges 29
  valkretsar fram till valnatten. Varje lag har en hemlig mullvad.
- **Riksdagen** — klassiskt socialt deduktionsspel: hitta den hemliga
  diktatorn innan demokratin faller.

## Distribuera på Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/robinandreeklund-collab/dictator-of-sweden)

Klicka på knappen, logga in på Render och godkänn — `render.yaml` i repot
sköter resten. Render kör `npm ci && npm run build` (klienten byggs in i
servern) och startar webbtjänsten automatiskt. Inget annat behövs.

> Deploy-knappen läser `render.yaml` från repots standardbranch. Ligger
> koden på en annan branch: välj **New → Blueprint** i Render, koppla repot
> och välj branchen `claude/dictator-sweden-game-JItkf` — Render hittar
> blueprinten där och bygger likadant.

## Kör lokalt

```bash
npm install        # installerar alla tre paket (shared, server, client)
npm run dev        # startar server + klient med hot reload
```

Klienten ligger på `http://localhost:5173`, servern på port `3001`.

Bygg och kör som i produktion:

```bash
npm start          # bygger klienten och startar servern på port 3001
```

## Tester

```bash
npm test                              # enhetstester (spelmotorerna)
npm run itest --workspace=server      # integrationstest, kräver att servern kör
npm run test:ui --workspace=client    # UI-test i webbläsare (kräver Playwright)
```

## Teknik

npm-workspaces med tre paket: `shared` (speltyper, regler och de
server-auktoritativa spelmotorerna), `server` (Express + Socket.IO) och
`client` (React + Vite). Servern serverar den byggda klienten, så hela
spelet körs som en enda webbtjänst.
