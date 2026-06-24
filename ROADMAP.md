# Roadmap

Faser från tom GitHub-repo till skalbart produktionssystem. Varje fas bygger på den förra.

| Fas | Mål | Visas på Pages? | Kräver backend? |
|-----|-----|----------------|-----------------|
| **0** | Repo, dokumentation, Pages-prototyp uppe | ✅ | Nej |
| **1** | Klickbar frontendprototyp med mockdata (alla vyer) | ✅ | Nej |
| **2** | MVP-arkitektur + datamodell (Prisma-schema, typer) | Delvis | Nej |
| **3** | Riktig backend, databas, kontaktimport (CSV/XLSX) | Nej | Ja |
| **4** | Segmentering, kampanjer, blockeditor | Nej | Ja |
| **5** | Send engine, provider-adapter, skarpa utskick | Nej | Ja |
| **6** | Analytics, provider-webhooks, unsubscribe | Nej | Ja |
| **7** | Automationer + dynamiskt innehåll | Nej | Ja |
| **8** | Avancerad analys, A/B-test, personalisering | Nej | Ja |
| **9** | Skalning, governance, integrationslager | Nej | Ja |

## Detaljer per fas

**Fas 0–1** (du är här): Få upp prototypen. Förankra känslan internt. Risk: låg. Komplexitet: låg.

**Fas 2**: Definiera datamodellen i Prisma och centrala TypeScript-typer. Ingen kod körs ännu – men strukturen låses. Beroende: enighet om datamodellen.

**Fas 3**: Första riktiga appen. Next.js + Postgres + auth. Kontaktimport med validering, deduplicering, skydd av opt-out/suppression. Risk: datakvalitet. Beroende: värdmiljö och databasleverantör.

**Fas 4**: Segmentmotor (JSON-regler → SQL), kampanjmodell, blockeditor (samma blockträd som prototypen). Risk: editor-komplexitet och e-postrendering. Beroende: fas 3.

**Fas 5**: Send engine med kö, worker, retry, rate limiting, provider-adapter. Här blir skarpa utskick möjliga. Risk: dubbla utskick, deliverability. Beroende: fas 4 + provider-konto (SES/Sendgrid).

**Fas 6**: Tracking, unsubscribe-länkar, provider-webhooks, analytics-dashboards. Risk: trackingprecision. Beroende: fas 5.

**Fas 7+**: Automationer återanvänder samma send-, segment- och eventmotor – bygg inte två parallella system. Dynamiskt innehåll via villkorsblock. Risk: komplexitet. Beroende: fas 4–6.

## Issue-labels att skapa
`type:feature` `type:bug` `type:docs` `area:editor` `area:segments` `area:send-engine` `area:contacts` `area:gdpr` `prio:high` `prio:med` `prio:low` `phase:0`…`phase:9` `good-first-issue`
