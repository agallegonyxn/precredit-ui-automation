import { test, expect } from '../../../src/fixtures';
import { Page, TestInfo } from '@playwright/test';
import { SignUpPage } from '../../../src/pages/SignUpPage';
import { uniqueTestEmail } from '../../../src/fixtures/testData';

// PCGL-140 — ACC.AJ.1.1.1 Sign Up: Envío y validación de OTP (correo externo)
//
// Alcance de este spec (confirmado en vivo contra QA antes de escribir el test):
// - PCGL-3249 — email mal formado: mensaje inline y botón deshabilitado. La app
//   muestra "Correo inválido" en vez de "Formato inválido" (criterio de
//   aceptación, Escenario 1) — ver PCGL-3825 (Defect, creado y confirmado con
//   el humano antes de automatizar). El test asserta el texto real.
// - PCGL-3250 (Escenario 1, parcial): apertura del modal OTP y estado inicial
//   de controles (E1).
// - Escenario 2: OTP incorrecto (E2).
// - Escenario 6: 3 intentos fallidos habilitan "Reenviar OTP"; reenvío exitoso
//   (E6).
//
// Fuera de alcance en ESTE spec de UI, pero cubierto a nivel API en
// tests/api/auth/pcgl-140-otp-api.spec.ts (misma Ejecución Automatizada PCGL-3824):
// - Escenario 5 (expiración) → PCGL-2898.
// - Escenario 6bis (bloqueo tras 3 reenvíos) → PCGL-3248.
//
// Fuera de alcance en todo el proyecto (ningún test case de la ejecución lo
// exige):
// - Escenario 1 completo (código correcto): el endpoint de prueba _test/otp
//   invalida el OTP que la propia UI genera al hacer clic en "Crear cuenta"
//   ("último gana"), por lo que el código obtenido nunca es el que el modal
//   está validando. Documentado también en los comentarios de PCGL-140.

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

test.describe('PCGL-140 — Sign Up email inválido', () => {
  test('PCGL-3249 — email mal formado muestra mensaje inline y deshabilita Crear cuenta', async ({
    page,
  }, testInfo) => {
    const signUpPage = new SignUpPage(page);
    await signUpPage.goto();

    await test.step('Ingresar email mal formado y quitar el foco', async () => {
      await signUpPage.emailInput.fill('no-es-un-email');
      await signUpPage.emailInput.blur();
    });

    await test.step('Se muestra mensaje inline y el botón queda deshabilitado', async () => {
      // Defecto conocido (PCGL-3825): el criterio de aceptación pide el texto
      // "Formato inválido"; la app real muestra "Correo inválido". Se asserta
      // el comportamiento real, no el del criterio.
      await expect(signUpPage.emailInlineError).toBeVisible();
      await expect(signUpPage.createAccountButton).toBeDisabled();
      await attachScreenshot(page, testInfo, '01-email-invalido');
    });
  });
});
