# PreCredit UI Automation — Instrucciones para agentes

Este archivo aplica a cualquier agente que trabaje en este repo (Claude Code, Codex,
ChatGPT u otro). Es la fuente única de reglas; no la dupliques ni la contradigas en
otro lado.

## Qué es este proyecto

Automatización E2E del frontend de PreCredit (ambiente QA: https://qa.pre-credit.com)
con Playwright + TypeScript, usando Page Object Model (POM). Las historias de usuario
y casos de prueba viven en Jira Cloud (doublevpartners.atlassian.net, proyecto PCGL,
board "Precredit GoLive 1.0"), gestionado con Xray (Historia → Test → Test Execution).

## Setup (una vez por persona/máquina, no por clon)

Este repo usa el plugin de Claude Code **ponytail** (auditor de sobreingeniería y
duplicidad) como estándar del proyecto — ya está declarado en `.claude/settings.json`
(`enabledPlugins`), así que viaja con el clon. Pero el *origen* del plugin (el
marketplace de GitHub) es una confianza a nivel de usuario/máquina, no del repo, por
lo que cada persona que clone el proyecto necesita correr esto una sola vez en su
Claude Code:

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
/reload-plugins
```

Después de eso, `AUDIT.md` explica cómo usarlo. Ver también `AUDIT.md` para el
resultado de la última auditoría del repo.

## Estructura

- `src/pages/` — Page Objects, una clase por pantalla/flujo.
- `src/components/` — componentes reutilizables entre páginas (modales, etc.).
- `src/fixtures/` — fixture de Playwright test y helpers de datos de prueba.
- `tests/ui/<módulo>/` — specs de UI (interacción de navegador vía Page Object
  Model), nombrados `pcgl-<numero>-<slug>.spec.ts`.
- `tests/api/<módulo>/` — specs de API pura, con el fixture `request` de
  Playwright, mismo naming. Endpoints/shapes se verifican en vivo contra QA
  antes de escribir aserciones, no se asumen del texto del test case.
- `scripts/xray.js` — CLI para la API de Xray Cloud (status de Test Run,
  evidencia). Uso en el header del archivo.

## Flujo de trabajo para automatizar un ticket

0. **Punto de partida: la Test Execution vinculada al ticket.**
   a. En la Historia de Jira, ir a la sección "Test" y ubicar la Test Execution
      vinculada cuyo nombre empieza con "Ejecución Automatizada". Comparar el
      nombre sin distinguir tildes ni mayúsculas/minúsculas: "Ejecución",
      "Ejecucion", "ejecución", "ejecucion automatizada", etc. son la misma
      convención. Abrirla para ver los test cases agrupados en esa ejecución.
   b. **Si no existe ninguna Test Execution vinculada con ese nombre, parar e
      informarlo al humano explícitamente.** No inventar una, no asumir cuál es,
      y no crearla uno mismo (crear un issue nuevo en Jira nunca es autónomo, ver
      "Disciplina de escritura en Jira").
   c. Para cada test case: revisar si ya está automatizado en este proyecto
      (`tests/ui/<módulo>/` o `tests/api/<módulo>/`, según corresponda — ver
      "Estructura"). Si no lo está, automatizarlo siguiendo el resto de este
      flujo (pasos 1 en adelante).
   d. El detalle de pasos de cada test case vive dentro del test case mismo en
      Xray. **No se crean test steps nuevos, no se crean test cases nuevos, y no
      se modifican los existentes** — son la fuente de verdad de qué probar, no
      un borrador editable.
   e. Ejecutar las pruebas automatizadas correspondientes a cada test case de la
      ejecución.
   f. Si el test pasa: marcar el **Test Run** (dentro de la Test Execution — el
      test run, no el issue Test original) como **PASSED**, y adjuntar la
      evidencia de esa corrida (ver "Reportes" más abajo). Esta actualización de
      estado + evidencia es una acción pre-aprobada por el humano para este
      flujo — no hace falta pedir permiso cada vez, a diferencia del resto de
      escrituras en Jira (ver "Disciplina de escritura en Jira"). Se hace con
      `scripts/xray.js set-status` / `add-evidence` (uso completo en el header
      del script); el testIssueId/testExecIssueId se resuelven antes vía Jira.
   g. Si el test falla: marcar el Test Run como **FAILED** con su evidencia
      adjunta (misma pre-aprobación que en el punto anterior), y seguir el flujo
      de "Cuando un test falla por algo que no es la automatización" más abajo
      para el triage y — solo con confirmación humana explícita — la creación
      del Bug/Defecto vinculado a ese test.
   h. **Si el 100% de los test cases de la ejecución quedan PASSED**, comentar en
      la Historia (el ticket principal, ej. PCGL-140 — no en la Test Execution)
      con el resumen de cierre. Esta escritura también está pre-aprobada: se
      publica y solo se notifica que se agregó, sin pedir permiso cada vez. Un
      comentario de cierre por ejecución, no uno por intento (mismo criterio que
      el resto de "Disciplina de escritura en Jira"). Formato:

      ```
      [QA Automation]
      Fecha de ejecución: <YYYY-MM-DD>
      Rama: <branch> (commit <hash corto>)
      Herramienta: Playwright + TypeScript (POM) — Claude Code, con
      estabilización y revisión manual
      Resultado: <N>/<N> passed
      Ejecución: <link a la Test Execution "Ejecución Automatizada">
      Test cases cubiertos: <PCGL-XXXX, PCGL-YYYY, ...>
      Evidencia: <link al reporte HTML/video, si aplica>
      ```

1. Determinar si el test case es UI, API, o ambos, según sus pasos. No asumir que
   todo es un test de navegador. Si es backend puro, usar el fixture `request` de
   Playwright en vez de forzar una interacción de UI que no está en los pasos del
   test case.
2. Si hay ambigüedad sobre qué automatizar, o el test case no calza con lo
   descrito en sus pasos, **parar y preguntar**. No inventar un flujo de UI que no
   está en el test case.
3. Verificar los selectores contra el DOM real (inspección headless con Playwright,
   o pedirle al humano que confirme) antes de escribirlos. No adivinar a partir del
   texto del test case.
4. Reutilizar Page Objects y fixtures existentes en vez de crear una abstracción
   nueva si ya existe una que cubre el caso.
5. **`main` es siempre la rama base.** Antes de crear la rama del ticket:
   a. Revisar en qué rama está parado el working tree actualmente.
   b. Si NO es `main`: revisar si hay cambios sin commitear o commits sin pushear
      en esa rama. Si los hay, **alertar al humano explícitamente** antes de seguir
      — no cambiar de rama silenciosamente y arriesgar perder de vista un trabajo
      en curso. Si el working tree está limpio y todo pusheado, cambiar a `main`.
   c. Actualizar la base: `git checkout main && git pull`.
   d. Recién ahí crear `feature/PCGL-<numero>` (o `bugfix/PCGL-<numero>` para
      defectos) desde `main`, ANTES de generar código, para aislar el trabajo.
6. Generar el código, ejecutar el suite, y estabilizarlo: correrlo más de una vez
   (incluido en modo paralelo) antes de darlo por estable.
7. Documentar en un comentario al inicio del spec qué test cases de la Ejecución
   Automatizada se cubren y cuáles quedan fuera de alcance, y por qué. Nunca dejar
   un vacío de cobertura sin explicarlo.

## Reglas fijas (no negociables sin aprobación explícita del humano en la conversación)

- Nunca `git commit`, `git push`, ni crear Pull Requests sin que el humano lo apruebe
  explícitamente en esa conversación. Crear la rama sí está permitido siempre al
  empezar un ticket.
- Nunca inventar selectores, textos de UI, o comportamiento no verificado. Ante la
  duda, detenerse y preguntar.
- Nunca commitear credenciales, tokens o secretos. `.env` está en `.gitignore`;
  `.env.example` documenta qué variables hacen falta, siempre vacías.
- El acceso a Jira es por sesión individual de cada persona (conector MCP de
  Atlassian vía `/mcp`, o token API personal según la herramienta). Nunca se
  comparte ni se guarda la sesión o el token de otra persona en el repo.
- El acceso a la API de Xray Cloud (para marcar status de Test Run y subir
  evidencia, ver paso 0 del flujo de trabajo) es igual de personal: cada quien
  genera su propio `XRAY_CLIENT_ID`/`XRAY_CLIENT_SECRET` (Xray → Global
  Settings → API Keys) y lo pone en su `.env` local. `.env.example` solo
  documenta las variables, siempre vacías — nunca se commitean credenciales
  reales de Xray, propias o ajenas.

## Cuando un test falla por algo que no es la automatización

Un fallo puede ser: (a) un problema del propio script/selector/timing, o (b) un
comportamiento real de la aplicación que está mal. Solo el caso (b) es candidato a
convertirse en un issue de Jira, y **nunca se crea sin confirmación humana explícita**.

1. **Triage primero, asumiendo que es la automatización.** Antes de sospechar de la
   app, descartar: selector roto/cambiado, condición de carrera, timeout corto,
   supuesto incorrecto del test, ruido del ambiente (reCAPTCHA, rate limit, etc. —
   ver particularidades del ambiente más abajo). Si la causa es alguna de estas,
   arreglar el test y listo: no se toca Jira.
2. **Si tras el triage el fallo parece ser la aplicación comportándose mal**,
   notificar al humano en la conversación con: qué falló, esperado vs. actual,
   evidencia (screenshot/trace/video), y una clasificación propuesta (no aplicada
   todavía):
   - **Bug** — el fallo interfiere con la funcionalidad pero NO está descrito
     explícitamente como criterio/requerimiento en la historia de usuario.
   - **Defecto** — el criterio/requerimiento SÍ está descrito explícitamente en la
     historia de usuario (criterios de aceptación) y no se cumple.
   - Prioridad sugerida:
     - **Baja** — incumplimiento de UI/visual, errores de ortografía.
     - **Media** — incumplimiento de funcionalidad no bloqueante.
     - **Alta** — incumplimiento de funcionalidad bloqueante, o cualquier defecto
       relacionado con seguridad.
   - Preguntar explícitamente: "¿Confirmás que esto es un [Bug/Defecto] real (no de
     la automatización)? ¿Lo creo con prioridad [X]?"
3. **Solo si el humano confirma que sí es un bug/defecto real**, crear el issue:
   - Bug → tipo de issue **"Error"** en Jira (nombre interno/no traducido: `Bug`).
   - Defecto → tipo de issue **"Defect"** (así, sin traducir, es el nombre real en
     este proyecto).
   - La Prioridad **no está en la pantalla de creación** de ninguno de los dos tipos
     en el proyecto PCGL — hay que crearlo primero y después setear la prioridad
     con una edición aparte (`Alta`→`High`, `Media`→`Medium`, `Baja`→`Low`).
   - Enlazar el nuevo issue a la Historia y/o Test relacionado (campo "Incidencias
     Enlazadas"), y referenciar en la descripción qué test lo detectó.
   - Usar el mismo template que ya usa el equipo (visto en PCGL-712): `[Título]`,
     `[Información del entorno]`, `[Descripción]`, `[Pasos para reproducir]`,
     `[Resultado esperado]`, `[Resultado actual]`.
4. Un issue por fallo confirmado, no uno por cada re-intento. Si un fallo ya
   generó un Bug/Defecto existente, no crear un duplicado — preguntar primero si
   parece ser el mismo caso.

## Disciplina de escritura en Jira (qué NO crear)

Jira/Xray permite crear issues nuevos con una sola llamada de API — eso lo hace
peligroso para un agente. La regla por defecto es **modo lectura + comentario**,
nunca creación:

- Nunca crear un issue nuevo en Jira (Historia, Test, Test Execution, Subtask,
  Epic) de forma autónoma. Si el flujo de evidencia pareciera requerir un issue
  nuevo (ej. no existe todavía un Test Execution para esta corrida), **parar y
  preguntar** en vez de crearlo.
- Solo comentar o adjuntar evidencia sobre el issue cuya key dio explícitamente el
  humano en la conversación. Nunca "adivinar" ni buscar un issue relacionado para
  escribirle en su lugar.
- Un comentario por ejecución, no uno por intento. Si el suite se corrió varias
  veces mientras se estabilizaba, se sube evidencia de la corrida final aprobada
  por el humano — no un comentario por cada corrida intermedia.
- Nunca transicionar el estado del issue (ej. mover a "Finalizada") a menos que el
  humano lo pida explícitamente. Reportar resultado en el comentario alcanza.
- Antes de cualquier escritura en Jira (comentario, adjunto, transición), decir
  explícitamente en la conversación qué se va a escribir y dónde, y esperar el
  visto bueno — igual que con el commit de código.
- **Excepción pre-aprobada:** marcar el Test Run como PASSED/FAILED dentro de una
  Test Execution "Ejecución Automatizada" y adjuntarle la evidencia de esa
  corrida, y — si el 100% de los test cases de la ejecución quedan PASSED —
  comentar el resumen de cierre en la Historia (ver paso 0 del flujo de
  trabajo), no requieren pedir permiso cada vez: el humano ya aprobó estas
  acciones como parte del proceso estándar; alcanza con notificar que se
  hicieron. Esto NO incluye transicionar el issue Test original ni el estado de
  la Historia, ni crear el Bug/Defecto asociado a un fallo, que siguen
  requiriendo confirmación explícita.

## Particularidades conocidas del ambiente QA (qa.pre-credit.com)

- Los `<input>` de login y sign-up no tienen `id`, `name` ni `aria-label` — se
  localizan por `type` (email/password/checkbox), no por accesibilidad. Es una
  limitación real de la app, no algo a "corregir" desde el test.
- El endpoint de prueba `_test/otp` (`qa.back.pre-credit.com`) invalida cualquier OTP
  previo del mismo correo ("último gana"). Esto rompe la coincidencia con el
  `otpId` que la propia UI generó al abrir el modal — por eso el happy path completo
  de OTP (código correcto) no se automatiza a nivel UI en este proyecto; ya está
  cubierto a nivel API en otro repo (`apps/api/tests/core/`).
- Emails de prueba siguen la convención del equipo: `qaprc<timestamp>@yopmail.com`
  (dominio desechable, consistente con lo que ya usa QA).
- Con `screenshot: 'on'` y `video: 'on'` activos (para que el reporte sirva como
  evidencia legible), el overhead de grabación puede hacer fallar aserciones con el
  timeout por defecto (5s) por lentitud, no por un bug real. El timeout global de
  `expect()` y del test están ampliados en `playwright.config.ts` (15s / 60s) para
  compensar esto — si aparecen fallos "flaky" de timing en tests nuevos, revisar ahí
  antes de asumir un bug de la app.

## Reportes

- HTML: `playwright-report/index.html` — abrir SIEMPRE con `npx playwright
  show-report` (sirve por HTTP). Abrirlo como archivo local no carga los datos
  embebidos correctamente.
- JSON: `test-results/results.json` — fuente para armar el comentario de ejecución
  que se sube a Jira.
- Ninguno de los dos se commitea (están en `.gitignore`).
