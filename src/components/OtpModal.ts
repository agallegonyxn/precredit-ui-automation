import { Page } from '@playwright/test';

export class OtpModal {
  readonly digitInputs = this.page.locator('input[maxlength="1"]');
  readonly continueButton = this.page.getByRole('button', { name: /continuar/i });
  readonly resendButton = this.page.getByRole('button', { name: /reenviar otp/i });
  readonly title = this.page.getByText('Ingresar OTP');

  constructor(private readonly page: Page) {}

  async enterCode(code: string) {
    for (let i = 0; i < code.length; i++) {
      await this.digitInputs.nth(i).fill(code[i]);
    }
  }

  async submit() {
    await this.continueButton.click();
  }

  async resend() {
    await this.resendButton.click();
  }

  toast(text: string | RegExp) {
    return this.page.getByText(text).last();
  }
}
