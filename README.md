# Valfeber 2026 — Hela Sveriges valrörelse

Ett gratis, nationellt multiplayer-spel där alla spelar tillsammans i en
**levande, bestående valkampanj** fram till riksdagsvalet 13 september 2026.

Du väljer ett av de åtta riksdagspartierna. Alla som spelar samma parti
bygger upp ett **gemensamt opinionsläge**. Varje dag loggar du in, gör ett
par åtgärder, ser direkt hur de påverkar opinionen i hela landet, och
klättrar på topplistan. På valdagen räknas mandaten och en regering bildas.

## Så spelas det

- **Välj parti och hemregion** när du skapar ditt konto.
- **Tre åtgärder om dagen** — välj bland fem:
  - 🔥 **Hantera dagens kris** — störst effekt, kan vända opinionen.
  - 🎤 **Svara i debatt** — övertyga väljarna i riktiga sakfrågor.
  - 📱 **Skriv viral post** — chans att spridas över hela landet.
  - 📍 **Kampanja regionalt** — höj stödet i en valkrets.
  - 🤝 **Förhandla allians** — samarbeta med ett annat parti.
- **Se resultatet direkt** — den delade opinionen, riksdagens mandat­fördelning
  och kartan över de 29 valkretsarna uppdateras live.
- **Klättra på topplistan** — globalt, inom ditt parti och i din region. Samla
  utmärkelser och håll din login-streak vid liv.
- **Valnatten** — när valdagen kommer stängs spelet för åtgärder, mandaten
  räknas och vinnande blocket bildar regering.

Bestående och delat: världen lever vidare varje dag och alla påverkar samma
opinionsläge. Spela ensam (mot fältet) eller bjud in hela Sverige med samma
adress.

## Distribuera på Render (med gratis Neon-databas)

Valfeber är ett bestående spel och behöver en databas. Neon erbjuder gratis
Postgres.

1. Skapa ett gratiskonto på **[neon.tech](https://neon.tech)**, skapa ett
   projekt och kopiera anslutningssträngen (*connection string*).
2. Klicka på knappen nedan och logga in på Render:

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/robinandreeklund-collab/dictator-of-sweden)

3. När Render frågar efter `DATABASE_URL`, klistra in Neon-strängen. Klart —
   Render bygger och startar allt automatiskt.

> Utan `DATABASE_URL` startar servern ändå, men med en lokal databas som
> nollställs vid omstart (bra för att prova, inte för en riktig kampanj).
>
> Deploy-knappen läser `render.yaml` från repots standardbranch. Ligger koden
> på en annan branch: välj **New → Blueprint** i Render och peka ut branchen.

## Kör lokalt

```bash
npm install        # installerar alla paket
npm run dev        # server + klient med hot reload
```

Ingen databas behövs lokalt — en inbäddad Postgres (PGlite) används
automatiskt. Sätt `DATABASE_URL` om du vill köra mot Neon även lokalt.

Bygg och kör som i produktion:

```bash
npm start          # bygger klienten och startar servern på port 3001
```

## Tester

```bash
npm test                              # enhetstester (delade spelmotorer)
npm run vtest --workspace=server      # backend-test mot inbäddad Postgres
npm run valfeber-ui --workspace=client # UI-test i webbläsare (kräver Playwright)
```

## Teknik

npm-workspaces med tre paket: `shared` (partier, 29 valkretsar, valuträkning),
`server` (Express REST-API + databaslager som kör Neon Postgres i produktion
och inbäddad Postgres lokalt) och `client` (React + Vite). Servern serverar
den byggda klienten, så hela spelet körs som en enda webbtjänst.
