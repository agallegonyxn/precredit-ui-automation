# Auditoría de sobreingeniería / duplicidad (ponytail)

Este proyecto usa el plugin de Claude Code [ponytail](https://ponytail.dev/) como
auditor de código limpio: busca duplicidad, abstracciones especulativas y
dependencias que la plataforma ya resuelve. Ver `AGENTS.md` para instalarlo si es
la primera vez que abrís este repo.

## Cómo correrlo

- `/ponytail-audit` — audita todo el repo (usar antes de un commit grande, o
  periódicamente).
- `/ponytail-review` — audita solo el diff/cambios en curso (usar antes de cada
  commit).
- `/ponytail-debt` — junta los comentarios `ponytail:` dejados en el código como
  atajos deliberados, para no perderlos de vista.

Es un reporte de una sola pasada: lista hallazgos, no aplica cambios. Después de
correrlo, actualizá este archivo con la fecha y el resultado.

## Última auditoría — 2026-07-29 (rama `feature/PCGL-140`)

```
yagni: LoginPage.ts sin ningún test que lo use aún (goToSignUp y forgotPasswordLink
  tampoco). Borrar hasta que un ticket necesite login autenticado; git lo recupera
  si hace falta. [src/pages/LoginPage.ts]
yagni: QA_USER/QA_PASSWORD declaradas en .env.example pero ningún código las lee.
  Quitar hasta que un spec necesite login autenticado. [.env.example]
yagni: src/fixtures/index.ts solo re-exporta test/expect sin ninguna
  personalización — passthrough puro. Importar directo de '@playwright/test' hasta
  que exista un fixture propio real. [src/fixtures/index.ts]
native: dotenv solo carga BASE_URL. Node 24 trae --env-file nativo; se puede sacar
  la dependencia y el dotenv.config(). [playwright.config.ts, package.json]

net: -28 líneas, -1 dependencia posible.
```

**Decisión tomada:** se mantiene `LoginPage.ts` a pesar del hallazgo `yagni` — este
proyecto es específicamente automatización de auth/login y se va a necesitar pronto;
borrarlo sería trabajo doble. Los otros tres hallazgos quedan pendientes de decisión.
