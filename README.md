# Dictator of Sweden — Valrörelsen 2026

Ett socialt strategi- och deduktionsspel om kampen om makten i Sveriges
riksdag. Tre eller fyra partilag tävlar i en kampanjduell över hela landet
fram till valnatten den 13 september 2026 — men i varje lag göms en
hemlig mullvad som i smyg vill se det egna partiet förlora.

Spelas i webbläsaren, 1–16 spelare. Tomma platser fylls med AI-bottar, så
det går att spela ensam eller i stor grupp via en delad rumskod.

## Om spelet

Varje lag styr ett riktigt riksdagsparti — Socialdemokraterna,
Moderaterna, Sverigedemokraterna, Centerpartiet och så vidare, med sina
egna sakfrågor och färger. Laget delar en privat lagchatt där strategin
smids. Målet är att få partiet att sitta i regering efter valet.

Haken: en slumpad medlem i varje lag är **mullvad**, i hemlighet köpt av
motståndarna. Mullvaden vinner om det egna laget hamnar i opposition — och
sitter med i lagchatten och planerar sabotage. Resten av laget måste lista
ut vem det är innan det är för sent.

## Så spelas det

Kampanjen löper över sex veckor. Varje vecka:

1. **Nyhetscykeln** — ett händelsekort vänds (gängskjutningar, elprischock,
   NATO-möte, vårdkris, Almedalen, bokslut över Tidöavtalet). Det avgör
   veckans heta sakfråga.
2. **Kampanjveckan** — alla lag agerar samtidigt. Lagledaren fördelar
   kampanjkassan på Sveriges 29 valkretsar direkt på kartan, väljer en
   sakfråga att driva och skickar partiledaren på besök. Att äga frågan
   eller träffa veckans heta ämne ger extra genomslag.
3. **Partiledardebatt** — två lag drabbar samman och opinionen svänger.
4. **Hemligt mullvadsdrag** — mullvaden kan sabotera lagets vecka utan att
   någon ser vem.
5. **Opinionsmätning** — kartan färgas om och mandatprognosen uppdateras.

Efter halva kampanjen hålls ett **internt krismöte** där varje lag röstar
om vem som är mullvaden. En korrekt utpekning oskadliggör mullvaden; en
felaktig sänker lagmoralen.

På **valnatten** räknas rösterna, 4-procentsspärren slår till och blocket
med flest mandat bildar regering. Sedan avslöjas alla mullvadar — och vilka
som i hemlighet jobbat emot sitt eget lag hela tiden.

## Funktioner

- **Kampanjduell lag mot lag** — 3–4 partilag, 1–16 spelare, AI-bottar
  fyller tomma platser.
- **Hemliga mullvadar** med dold sabotage, lagchatt och internt krismöte.
- **Interaktiv Sverigekarta** med alla 29 riksdagsvalkretsar som färgas om
  i realtid efter ledande parti.
- **Riksdagen som live mandathalvcirkel** — 349 platser, blockställning och
  4-procentsspärr uppdateras vecka för vecka.
- **Verklighetsförankrade 2026-händelser** som styr vilka frågor som
  hettar till.
- **Simultan kampanjfas** — inga långa väntetider på sin tur.
- **Dramatisk valnatt** med rösträkning, regeringsbildning och facit om hur
  det svenska valsystemet faktiskt fungerar.
- **Lagchatt och allmän debattchatt**, rumskoder, återanslutning och
  AFK-skydd som låter spelet flyta även om någon tappar uppkopplingen.

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
npm test                              # enhetstester (spelmotorn)
npm run itest --workspace=server      # integrationstest, kräver att servern kör
npm run test:ui --workspace=client    # UI-test i webbläsare (kräver Playwright)
```

## Teknik

npm-workspaces med tre paket: `shared` (speltyper, regler och den
server-auktoritativa kampanjmotorn), `server` (Express + Socket.IO) och
`client` (React + Vite). Servern serverar den byggda klienten, så hela
spelet körs som en enda webbtjänst.
