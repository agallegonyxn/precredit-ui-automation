import { Page } from '@playwright/test';

export class ResultsTable {
  // La tabla siempre renderiza el tamaño de página completo (10/25/50) como
  // <tr>, rellenando con filas vacías cuando hay menos resultados reales.
  // Se filtran por texto no vacío en la celda ID para no contar el relleno.
  readonly rows = this.page.locator('tbody tr').filter({ has: this.page.locator('td:nth-child(1):not(:empty)') });

  constructor(private readonly page: Page) {}

  row(evaluationId: string) {
    return this.rows.filter({ hasText: evaluationId });
  }

  sortToggle(column: string) {
    return this.page.locator(`[title="Ordenar por ${column}"]`);
  }

  filterButton(column: string) {
    return this.page.locator(`button[aria-label="Filtrar por ${column}"]`);
  }

  private filterPopover(column: string) {
    return this.page.locator('app-column-filter-popover').filter({ has: this.filterButton(column) });
  }

  async applyTextFilter(column: string, text: string) {
    await this.filterButton(column).click();
    const popover = this.filterPopover(column);
    await popover.locator('input[type="text"]').fill(text);
    await popover.getByRole('button', { name: 'Aplicar' }).click();
    await this.waitForFilterToApply();
  }

  async applyMultiSelectFilter(column: string, options: string[]) {
    await this.filterButton(column).click();
    const popover = this.filterPopover(column);
    for (const option of options) {
      await popover.locator('label').filter({ hasText: option }).locator('input[type="checkbox"]').check();
    }
    await popover.getByRole('button', { name: 'Aplicar' }).click();
    await this.waitForFilterToApply();
  }

  async applyDateRangeFilter(from?: string, to?: string) {
    await this.filterButton('Fecha').click();
    const popover = this.filterPopover('Fecha');
    const dateInputs = popover.locator('input[type="date"]');
    if (from) await dateInputs.nth(0).fill(from);
    if (to) await dateInputs.nth(1).fill(to);
    await popover.getByRole('button', { name: 'Aplicar' }).click();
    await this.waitForFilterToApply();
  }

  // El indicador "Mostrando X-Y de Z" y las filas tardan un instante en
  // recalcularse tras aplicar un filtro; leerlos inmediatamente da datos viejos.
  private async waitForFilterToApply() {
    await this.page.waitForTimeout(800);
  }

  async clearFilter(column: string) {
    await this.filterButton(column).click();
    await this.filterPopover(column).getByRole('button', { name: 'limpiar' }).click();
  }

  columnCells(index1based: number) {
    return this.rows.locator(`td:nth-child(${index1based})`);
  }

  semaforoBadge(evaluationId: string) {
    return this.row(evaluationId).locator('td').nth(7).locator('div.rounded-full');
  }

  decisionBadge(evaluationId: string) {
    return this.row(evaluationId).locator('td').nth(8).locator('div.rounded-full');
  }

  changeDecisionButton(evaluationId: string) {
    return this.row(evaluationId).locator('i.fi-rr-balance-scale-right');
  }

  async openExpediente(evaluationId: string) {
    await this.row(evaluationId).locator('td').nth(1).click();
  }

  pageButton(n: number) {
    return this.page.getByRole('button', { name: String(n), exact: true });
  }

  get prevPageButton() {
    return this.page.locator('button').filter({ has: this.page.locator('i.fi-rr-angle-small-left') });
  }

  get nextPageButton() {
    return this.page.locator('button').filter({ has: this.page.locator('i.fi-rr-angle-small-right') });
  }

  get paginationInfo() {
    return this.page.getByText(/Mostrando \d+-\d+ de \d+ resultados/);
  }
}
