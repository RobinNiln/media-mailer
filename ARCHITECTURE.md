# Arkitektur

## Kärnprincip: design är data, inte HTML

Ett mejl modelleras som ett **JSON-blockträd** (sektioner → rader → kolumner → block). HTML genereras *först* vid preview, testutskick och skarpt utskick. Detta ger:

- versionshantering och jämförelse av kampanjversioner
- dynamiskt/villkorsstyrt innehåll per mottagare
- robust, tabellbaserad HTML som fungerar i Outlook, Gmail, Apple Mail
- återanvändbara block och mallar

Se `prototype/assets/editor.js` → `generateEmailHtml()` för en förenklad demonstration av principen.

## Varför hybrid-editor (inte helt fri canvas)

E-post är inte webbdesign. Outlook använder Words renderingsmotor; fri pixelplacering, flexbox och moderna CSS-funktioner går sönder. Lösningen är en **hybrid**: canvas-liknande känsla med drag-and-drop, men block snappar till en strukturerad grid av sektioner/rader/kolumner. Systemet validerar layouten och varnar för design som inte fungerar. Användaren får kreativ frihet *inom säkra containrar*.

## Produktionsarkitektur (nivå 2/3)

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js + React + TypeScript + Tailwind)      │
│  - Editor (blockträd), kampanjer, segment, analytics     │
└───────────────┬─────────────────────────────────────────┘
                │ API (REST/tRPC)
┌───────────────▼─────────────────────────────────────────┐
│  Backend / API-lager                                     │
│  - Auth + rollbaserad behörighet (RBAC)                  │
│  - Segmentmotor (JSON-regler → SQL)                      │
│  - HTML-renderer (blockträd → e-post-HTML)               │
│  - Audit log                                             │
└───┬───────────────┬──────────────────┬──────────────────┘
    │               │                  │
┌───▼────┐   ┌──────▼──────┐   ┌───────▼────────┐
│Postgres│   │ Redis + kö   │   │ Objektlagring  │
│(Prisma)│   │ + workers    │   │ (bilder/assets)│
└────────┘   └──────┬───────┘   └────────────────┘
                    │ provider-adapter
            ┌───────▼─────────────────┐
            │ Extern e-postprovider    │
            │ (SES/Sendgrid/Postmark)  │
            │ → faktisk leverans       │
            │ → bounce/complaint/      │
            │   delivery webhooks ─────┼──► tillbaka till backend
            └──────────────────────────┘
```

## Integrationslager (ingen direktkoppling)

Mejlverktyget läser **aldrig** direkt mot interna produktionsdatabaser. Flöde:

```
Interna system (prenumeration/kund/betalstatus)
   → integrationslager (API / schemalagd export / event)
   → mejlverktygets EGNA mottagardatabas
   → segment → kampanjer → utskick → analytics
```

**Mejlverktyget äger:** samtyckesstatus, unsubscribe, suppression, utskickshistorik, engagemang.
**Interna system äger:** identitet (contact_id), betalstatus, prenumerationsstatus.
**Konfliktregel:** opt-out och suppression skrivs aldrig över vid import.

## Send engine – flöde

1. Kampanj skapas → segment + exkludering väljs
2. Förhandsgranskning av mottagarantal
3. Testutskick → granskning → godkännande
4. Schemaläggs/skickas → **mottagarsnapshot** skapas
5. Filtrera bort avregistrerade, spärrade, ogiltiga
6. Rendera mejl per mottagare (med dynamiskt innehåll)
7. Lägg i kö → worker skickar via provider-API (retry, rate limit)
8. Provider-webhooks → uppdatera status och analytics

Skydd mot dubbla utskick: idempotensnyckel per (kampanjversion, mottagare). Suppression kontrolleras vid både snapshot och sändning.

## Rekommenderad stack
Next.js · TypeScript · React · PostgreSQL · Prisma · Redis (BullMQ-kö) · provider-adapter · S3-kompatibel objektlagring · Vercel/containerhosting · structured logging + felspårning.
