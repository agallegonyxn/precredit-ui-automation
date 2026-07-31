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

  // El login real tiene reCAPTCHA con scoring de comportamiento: incluso con
  // --disable-blink-features=AutomationControlled (ver playwright.config.ts),
  // la navegación post-login falla ~4 de cada 5 veces. Se reintenta recargando
  // el form en vez de asumir que un solo intento alcanza.
  async login(email: string, password: string, attempts = 5) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      // Limpiar cookies y storage antes de reintentar: un intento fallido puede
      // dejar tokens en localStorage (la API de login igual respondió 201) y
      // arrastrar ese estado confunde tanto a la SPA como al scoring de reCAPTCHA.
      await this.page.context().clearCookies();
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});

      await this.goto();
      // Llenar el form apenas carga (antes de que reCAPTCHA/Angular terminen de
      // inicializar) empeora el scoring y baja la tasa de éxito notablemente.
      await this.page.waitForTimeout(3000);
      await this.emailInput.fill(email);
      await this.passwordInput.fill(password);
      await this.loginButton.click();

      const navigated = await this.page
        .waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

      if (navigated) return;
    }

    throw new Error(`Login no navegó fuera de /auth/login tras ${attempts} intentos`);
  }
}
