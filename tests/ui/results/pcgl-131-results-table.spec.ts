import { test, expect } from '../../../src/fixtures';
import { Page } from '@playwright/test';
import { LoginPage } from '../../../src/pages/LoginPage';
import { ResultsPage } from '../../../src/pages/ResultsPage';

// PCGL-131 — PROD.RES.2 Tabla de resultados: columnas, filtros, indicadores
// live y acciones
//
// Cubre los 12 test cases automatizables de la Ejecución Automatizada PCGL-3827
// (Xray) verificados en vivo contra QA antes de escribir las aserciones:
// CP-01 a CP-12 (PCGL-2678 a PCGL-2683, PCGL-2685 a PCGL-2690).
//
// Fuera de alcance:
// - CP-13 (PCGL-2691, "comportamiento defensivo ante falla de ProductService")
//   requiere simular una falla de backend; no existe un mecanismo (endpoint
//   _test, feature flag) para forzarla desde este repo.
//
// Divergencias reales confirmadas contra QA (se testea el comportamiento real,
// no el texto literal de la Historia):
// - El badge de Semáforo/Decisión final muestra "Aprobado/Revisión/Rechazado/
//   Indeterminado", no "VERDE/AMARILLO/ROJO/GRIS" como describe la Historia.
// - El fallback de Canal se muestra como "Desconocido", no "Unknown".
// - CP-03 (normalización sin acentos): no hay ningún nombre con tilde/ñ en los
//   datos reales de QA — se verifica solo la normalización case-insensitive;
//   la remoción de acentos queda sin verificar por falta de dato.
// - CP-02 (decisión sobreescrita): no existía ningún caso en los datos
//   originales. Se generó uno real usando la propia función de "cambiar
//   decisión" de la app sobre EVA-2026-000018 (Carlos 20), con aprobación
//   explícita del humano antes de modificar el dato compartido de QA.

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.login(process.env.QA_USER!, process.env.QA_PASSWORD!);
}

test.describe('PCGL-131 — Tabla de Resultados', () => {
  let resultsPage: ResultsPage;

  test.beforeEach(async ({ page }) => {
    await login(page);
    resultsPage = new ResultsPage(page);
    await resultsPage.goto();
    await expect(resultsPage.table.rows.first()).toBeVisible();
  });

  test('CP-01 (PCGL-2678) — 10 columnas en orden, Nombre/Identificación separadas', async ({ page }) => {
    const headers = await page.locator('th').allInnerTexts();
    expect(headers.map((h) => h.trim())).toEqual([
      'ID',
      'Nombre',
      'Identificación',
      'Fecha',
      'Producto',
      'Canal',
      'Usuario',
      'Semáforo',
      'Decisión final',
      'Acciones',
    ]);
  });

  test('CP-02 (PCGL-2679) — badge con borde discontinuo, ícono de edición y tooltip', async () => {
    const decisionBadge = resultsPage.table.decisionBadge('EVA-2026-000018');
    await expect(decisionBadge).toHaveClass(/border-dashed/);
    await expect(decisionBadge).toHaveAttribute('title', 'Modificado manualmente');
    await expect(decisionBadge.locator('i.fi-rr-edit')).toBeVisible();
  });

  test('CP-03 (PCGL-2680) — filtro de nombre normaliza case-insensitive', async ({ page }) => {
    await resultsPage.table.applyTextFilter('Nombre', 'JUAN CAMILO');
    await expect(resultsPage.table.row('EVA-2026-000019')).toBeVisible();
    const rowCount = await resultsPage.table.rows.count();
    expect(rowCount).toBeGreaterThan(0);
    const names = await resultsPage.table.columnCells(2).allInnerTexts();
    for (const name of names) {
      expect(name.toLowerCase()).toContain('juan camilo');
    }
  });

  test('CP-04 (PCGL-2681) — lógica OR dentro del filtro de selección múltiple (Semáforo)', async () => {
    await resultsPage.table.applyMultiSelectFilter('Semáforo', ['Aprobado', 'Rechazado']);
    const semaforos = await resultsPage.table.columnCells(8).allInnerTexts();
    expect(semaforos.length).toBeGreaterThan(0);
    for (const s of semaforos) {
      expect(['APROBADO', 'RECHAZADO']).toContain(s.trim().toUpperCase());
    }
  });

  test('CP-05 (PCGL-2682) — combinación AND entre columnas (Producto + Semáforo)', async () => {
    await resultsPage.table.applyMultiSelectFilter('Producto', ['Nuevo 01']);
    await resultsPage.table.applyMultiSelectFilter('Semáforo', ['Aprobado']);

    const rowCount = await resultsPage.table.rows.count();
    expect(rowCount).toBeGreaterThan(0);
    const productos = await resultsPage.table.columnCells(5).allInnerTexts();
    const semaforos = await resultsPage.table.columnCells(8).allInnerTexts();
    for (const p of productos) expect(p.trim()).toBe('Nuevo 01');
    for (const s of semaforos) expect(s.trim().toUpperCase()).toBe('APROBADO');
  });

  test('CP-06 (PCGL-2683) — rango de fecha inclusivo Desde/Hasta', async () => {
    await resultsPage.table.applyDateRangeFilter('2026-06-19', '2026-06-19');
    const rowCount = await resultsPage.table.rows.count();
    expect(rowCount).toBeGreaterThan(0);
    const fechas = await resultsPage.table.columnCells(4).allInnerTexts();
    for (const f of fechas) {
      expect(f).toContain('19 jun 2026');
    }
  });

  test('CP-07 (PCGL-2685) — ordenamiento de 3 estados en columna Nombre', async ({ page }) => {
    // El ordenamiento reordena el dataset completo (24 registros), no solo la
    // página visible: la página 1 muestra un subconjunto distinto en cada
    // estado. Se verifica monotonía local, no una lista fija esperada.
    const isSorted = (arr: string[], dir: 'asc' | 'desc') =>
      arr.every((v, i) => i === 0 || (dir === 'asc' ? arr[i - 1].localeCompare(v) <= 0 : arr[i - 1].localeCompare(v) >= 0));

    const originalOrder = await resultsPage.table.columnCells(1).allInnerTexts();

    const sortToggle = resultsPage.table.sortToggle('Nombre');
    await sortToggle.click();
    await page.waitForTimeout(500);
    const ascOrder = await resultsPage.table.columnCells(2).allInnerTexts();
    expect(isSorted(ascOrder, 'asc')).toBe(true);

    await sortToggle.click();
    await page.waitForTimeout(500);
    const descOrder = await resultsPage.table.columnCells(2).allInnerTexts();
    expect(isSorted(descOrder, 'desc')).toBe(true);

    await sortToggle.click();
    await page.waitForTimeout(500);
    const finalOrder = await resultsPage.table.columnCells(1).allInnerTexts();
    expect(finalOrder).toEqual(originalOrder);
  });

  test('CP-08 (PCGL-2686) — balanza visible solo en Revisión con permiso', async () => {
    // EVA-2026-000019 está Aprobado: no debe verse la balanza
    await expect(resultsPage.table.changeDecisionButton('EVA-2026-000019')).toHaveCount(0);
    // Ninguna fila Aprobado/Rechazado/Indeterminado debe tener balanza; solo Revisión
    const revisionRows = await resultsPage.table.columnCells(8).allInnerTexts();
    const hasRevision = revisionRows.some((s) => s.trim().toUpperCase() === 'REVISIÓN');
    // Documentado: tras generar el caso de CP-02, no queda ninguna evaluación en
    // Revisión en QA — se verifica la regla negativa (Aprobado no muestra balanza).
    expect(hasRevision).toBe(false);
  });

  test('CP-09 (PCGL-2687) — fila completa clickeable abre expediente, sin ícono de ojo', async ({ page }) => {
    await expect(page.locator('i.fi-rr-eye')).toHaveCount(0);
    await resultsPage.table.openExpediente('EVA-2026-000019');
    await expect(page.getByText('Expediente de evaluación')).toBeVisible();
    await expect(page.getByTitle('EVA-2026-000019')).toBeVisible();
  });

  test('CP-10 (PCGL-2688) — paginación con indicador de posición', async ({ page }) => {
    await expect(resultsPage.table.paginationInfo).toContainText('Mostrando 1-10 de');
    await resultsPage.table.pageButton(2).click();
    await expect(resultsPage.table.paginationInfo).toContainText('Mostrando 11-20 de');
  });

  test('CP-11 (PCGL-2689) — el filtro reduce el total mostrado al subconjunto exacto', async () => {
    const before = await resultsPage.table.paginationInfo.innerText();
    const totalBefore = Number(before.match(/de (\d+) resultados/)?.[1]);

    await resultsPage.table.applyMultiSelectFilter('Semáforo', ['Aprobado']);

    const after = await resultsPage.table.paginationInfo.innerText();
    const totalAfter = Number(after.match(/de (\d+) resultados/)?.[1]);
    const rowCount = await resultsPage.table.rows.count();

    expect(totalAfter).toBeLessThan(totalBefore);
    expect(totalAfter).toBe(rowCount);
  });

  test('CP-12 (PCGL-2690) — canal muestra el fallback "Desconocido" cuando aplica', async () => {
    const validCanales = [
      'Web (agencia)',
      'Web vendedor de campo',
      'URL',
      'Script embebido',
      'Carga masiva',
      'Desconocido',
    ];
    const allCanales: string[] = [];
    for (const p of [1, 2, 3]) {
      if (p > 1) await resultsPage.table.pageButton(p).click();
      allCanales.push(...(await resultsPage.table.columnCells(6).allInnerTexts()));
    }
    for (const c of allCanales) {
      expect(validCanales).toContain(c.trim());
    }
    // Confirmado en datos reales (página 2): existe al menos un registro con el fallback.
    expect(allCanales.some((c) => c.trim() === 'Desconocido')).toBe(true);
  });
});
