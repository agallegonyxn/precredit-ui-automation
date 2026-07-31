import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { ResultsTable } from '../components/ResultsTable';

export class ResultsPage extends BasePage {
  readonly searchInput = this.page.getByPlaceholder('Buscar...');
  readonly clearFiltersButton = this.page.getByText('Limpiar filtros', { exact: true });
  readonly table = new ResultsTable(this.page);

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/home/products/results');
  }

  indicator(label: string) {
    return this.page.getByText(new RegExp(`${label}\\s*:?\\s*\\d+`, 'i'));
  }
}
