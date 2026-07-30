import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { OtpModal } from '../components/OtpModal';

export class SignUpPage extends BasePage {
  readonly emailInput = this.page.locator('input[type="email"]').first();
  readonly termsCheckbox = this.page.locator('input[type="checkbox"]').first();
  readonly createAccountButton = this.page.getByRole('button', { name: /crear cuenta/i });
  readonly emailInlineError = this.page
    .locator('precredit-input')
    .filter({ has: this.page.locator('input[type="email"]') })
    .getByText(/correo inválido/i);
  readonly otpModal = new OtpModal(this.page);

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/auth/sign-up');
  }

  async requestOtp(email: string) {
    await this.emailInput.fill(email);
    await this.emailInput.blur();
    await this.termsCheckbox.check({ force: true });
    await this.createAccountButton.click();
  }
}
