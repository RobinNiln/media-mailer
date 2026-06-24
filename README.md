# Media Mailer

Internt verktyg för att skapa, rikta, skicka och analysera mejlutskick för en medieorganisation. Byggt för många nyhetsbrev, målgrupper, segment och kampanjer – inte för generisk e-handel.

> **Detta är inte ett CMS.** Innehåll skapas direkt i verktyget. Faktisk e-postleverans sker via extern provider (t.ex. Amazon SES, Sendgrid, Postmark).

---

## Tre nivåer – håll isär dem

| Nivå | Vad | Var det körs | Skickar mejl? |
|------|-----|--------------|---------------|
| **1. Prototyp** | Klickbar demo, mockdata, simulerade flöden | GitHub Pages | Nej |
| **2. Riktig app** | Backend, databas, send engine | Vercel + databasleverantör | Ja |
| **3. Produktion** | Härdad, övervakad, skalad | Produktionsmiljö | Ja |

Den här mappen (`prototype/`) är **nivå 1**. Den har ingen databas och skickar inga mejl. Allt är simulerat för att visa hur produkten ska kännas.

---

## Så här publicerar du prototypen (utan terminal)

1. **Skapa repot**: GitHub → **New repository** → namn `media-mailer` → ✅ Add a README.
2. **Lägg in filerna**: För varje fil nedan, klicka **Add file → Create new file**, skriv sökvägen (t.ex. `prototype/index.html`) i namnfältet, klistra in innehållet, klicka **Commit changes**.
3. **Aktivera Pages**: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Vänta på bygget**: Gå till fliken **Actions**. När workflowen "Deploy Prototype to GitHub Pages" blivit grön är sidan live.
5. **Öppna sidan**: URL:en visas under **Settings → Pages** (t.ex. `https://<användarnamn>.github.io/media-mailer/`).

Vill du ändra något senare? Öppna filen i GitHub, klicka pennikonen ✎, redigera, **Commit**. Bygget kör om automatiskt.

---

## Filstruktur (prototyp)

```
prototype/
├── index.html              # Skal, sidomeny, laddar JS
├── assets/
│   ├── app.js              # Routing + alla vyer
│   └── editor.js           # Drag-and-drop-editor + bekräftelsevy
└── data/
    ├── contacts.json       # Mockkontakter
    ├── campaigns.json      # Mockkampanjer
    └── app-data.json       # Segment, mallar, block, exempel-layout, analytics
```

## Vad fungerar i prototypen

✅ Navigering mellan alla vyer · ✅ Drag-and-drop i editorn (dra block till canvasen) · ✅ HTML genereras live från blockträdet · ✅ JSON-vy av designen · ✅ Bekräftelsevy före utskick med bortfiltrering · ✅ Simulerad import

## Vad är simulerat

⚠️ Inga riktiga mejl · ⚠️ Ingen databas · ⚠️ Siffror är mockdata · ⚠️ Segment beräknas inte på riktigt

---

Se [`ROADMAP.md`](ROADMAP.md) för faser och [`ARCHITECTURE.md`](ARCHITECTURE.md) för produktionsarkitektur.
