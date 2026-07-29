import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput = this.page.locator('input[type="email"]').first();
  readonly passwordInput = this.page.locator('input[type="password"]').first();
  readonly loginButton = this.page.getByRole('button', { name: /iniciar sesión/i });
  readonly signUpLink = this.page.getByRole('link', { name: /regístrate/i });
  readonly forgotPasswordLink = this.page.getByRole('link', { name: /olvidaste tu contraseña/i });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/auth/login');
  }

  async goToSignUp() {
    await this.signUpLink.click();
  }
}
