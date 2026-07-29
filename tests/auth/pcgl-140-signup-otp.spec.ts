import { test, expect } from '../../src/fixtures';
import { Page, TestInfo } from '@playwright/test';
import { SignUpPage } from '../../src/pages/SignUpPage';
import { uniqueTestEmail } from '../../src/fixtures/testData';

// PCGL-140 — ACC.AJ.1.1.1 Sign Up: Envío y validación de OTP (correo externo)
//
// Alcance de este spec (confirmado en vivo contra QA antes de escribir el test):
// - Escenario 1 (parcial): apertura del modal OTP y estado inicial de controles.
// - Escenario 2: OTP incorrecto.
// - Escenario 6: 3 intentos fallidos habilitan "Reenviar OTP"; reenvío exitoso.
//
// Fuera de alcance (documentado, no omitido por descuido):
// - Escenario 1 completo (código correcto): el endpoint de prueba _test/otp invalida
//   el OTP que la propia UI genera al hacer clic en "Crear cuenta" ("último gana"),
//   por lo que el código obtenido nunca es el que el modal está validando. El mismo
//   bloqueo está documentado por el equipo en los comentarios de PCGL-140 y ya se
//   verifica a nivel API en apps/api/tests/core/pcgl-140-otp-signup.spec.ts.
// - Escenario 5 (expiración, 10 min) y Escenario 6bis (bloqueo tras 3 reenvíos,
//   requiere 9 intentos fallidos + 3 reenvíos): no incluidos en esta primera entrega.

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

test.describe('PCGL-140 — Sign Up OTP', () => {
  let signUpPage: SignUpPage;

  test.beforeEach(async ({ page }, testInfo) => {
    await test.step('Ir a Sign Up y solicitar OTP con un correo válido', async () => {
      signUpPage = new SignUpPage(page);
      await signUpPage.goto();
      await signUpPage.requestOtp(uniqueTestEmail());
      await expect(signUpPage.otpModal.title).toBeVisible();
      await attachScreenshot(page, testInfo, '01-modal-otp-abierto');
    });
  });

  test('E1 — el modal de OTP exige 6 dígitos antes de habilitar Continuar', async ({ page }, testInfo) => {
    await test.step('Continuar permanece deshabilitado sin código', async () => {
      await expect(signUpPage.otpModal.continueButton).toBeDisabled();
    });

    await test.step('Continuar sigue deshabilitado con un código incompleto (5 dígitos)', async () => {
      await signUpPage.otpModal.enterCode('12345');
      await expect(signUpPage.otpModal.continueButton).toBeDisabled();
      await attachScreenshot(page, testInfo, '02-codigo-incompleto-continuar-deshabilitado');
    });

    await test.step('Continuar se habilita al completar los 6 dígitos', async () => {
      await signUpPage.otpModal.enterCode('123456');
      await expect(signUpPage.otpModal.continueButton).toBeEnabled();
      await attachScreenshot(page, testInfo, '03-codigo-completo-continuar-habilitado');
    });
  });

  test('E2 — OTP incorrecto muestra toast y mantiene el modal abierto', async ({ page }, testInfo) => {
    await test.step('Enviar un código incorrecto', async () => {
      await signUpPage.otpModal.enterCode('000000');
      await signUpPage.otpModal.submit();
    });

    await test.step('Se muestra el toast "OTP inválido" y el modal sigue abierto', async () => {
      await expect(signUpPage.otpModal.toast(/OTP inválido/i)).toBeVisible();
      await expect(signUpPage.otpModal.title).toBeVisible();
      await attachScreenshot(page, testInfo, '02-toast-otp-invalido');
    });
  });

  test('E6 — 3 intentos fallidos habilitan Reenviar OTP, y el reenvío es exitoso', async ({ page }, testInfo) => {
    await test.step('Reenviar OTP permanece deshabilitado antes de fallar intentos', async () => {
      await expect(signUpPage.otpModal.resendButton).toBeDisabled();
    });

    for (let attempt = 1; attempt <= 3; attempt++) {
      await test.step(`Intento fallido ${attempt} de 3`, async () => {
        await signUpPage.otpModal.enterCode('000000');
        await signUpPage.otpModal.submit();
        await expect(signUpPage.otpModal.toast(/OTP inválido/i)).toBeVisible();
        // La app limpia y refocaliza los inputs tras un intento inválido; esperamos
        // a que termine esa limpieza antes del siguiente intento.
        await expect(signUpPage.otpModal.digitInputs.first()).toHaveValue('');
      });
    }

    await test.step('Reenviar OTP se habilita tras 3 intentos fallidos', async () => {
      await expect(signUpPage.otpModal.resendButton).toBeEnabled();
      await attachScreenshot(page, testInfo, '02-reenviar-otp-habilitado');
    });

    await test.step('El reenvío muestra el toast de éxito', async () => {
      await signUpPage.otpModal.resend();
      await expect(signUpPage.otpModal.toast(/OTP enviado con éxito/i)).toBeVisible();
      await attachScreenshot(page, testInfo, '03-toast-reenvio-exitoso');
    });
  });
});
