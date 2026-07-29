# PreCredit UI Automation

Automatización E2E del frontend de PreCredit (ambiente QA) con **Playwright +
TypeScript**, usando el patrón **Page Object Model (POM)**.

- Ambiente: https://qa.pre-credit.com
- Historias y casos de prueba: Jira Cloud, proyecto **PCGL** ("Precredit GoLive 1.0")

## Quick start

```bash
npm install          # instala dependencias y descarga el navegador (postinstall)
npm test             # corre el suite
npm run report       # abre el último reporte HTML (usa este comando, no abras el archivo directo)
```

## Estructura

```
src/pages/        Page Objects
src/components/   componentes reutilizables (modales, etc.)
src/fixtures/     fixture de test + datos de prueba
tests/<módulo>/   specs, uno por ticket/feature
```

## Para agentes / flujo de trabajo con Jira

Ver [`AGENTS.md`](./AGENTS.md) — ahí está el flujo completo para automatizar un
ticket, las reglas fijas (Git, Jira, seguridad) y las particularidades conocidas
del ambiente QA. Incluye el setup de una vez por persona para el auditor de código
(`ponytail`) usado en este proyecto — ver también [`AUDIT.md`](./AUDIT.md).
