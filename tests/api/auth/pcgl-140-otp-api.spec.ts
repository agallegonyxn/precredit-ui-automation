import { test, expect } from '../../../src/fixtures';
import { uniqueTestEmail } from '../../../src/fixtures/testData';

// PCGL-140 — ACC.AJ.1.1.1 Sign Up: Envío y validación de OTP (API)
//
// Cubre los test cases de tipo API de la Ejecución Automatizada PCGL-3824
// (Xray): PCGL-3243, 3244, 3245, 3246, 3247, 3248, 2898. Ninguno queda fuera
// de alcance en este spec.
//
// Endpoint y shapes verificados en vivo contra qa.back.pre-credit.com antes de
// escribir las aserciones (no se asumieron del texto de los test cases, que
// tenían el path parcialmente inconsistente entre sí).

const API_BASE =
  `${process.env.API_BASE_URL ?? 'https://qa.back.pre-credit.com'}` +
  '/api/core/v1/web/auth/sign-up';

test.describe('PCGL-140 — Sign Up OTP (API)', () => {
  test('PCGL-3243 — request con email válido retorna 201 con schema completo', async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/otp/request`, {
      data: { email: uniqueTestEmail() },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ attemptsLeft: 3, resendsLeft: 3 });
    expect(body.otpId).toBeTruthy();
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('PCGL-3244 — request con email mal formado retorna 400', async ({ request }) => {
    const res = await request.post(`${API_BASE}/otp/request`, {
      data: { email: 'no-es-email' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message.join(' ')).toMatch(/email/i);
  });

  test('PCGL-3245 — validate con código incorrecto retorna valid:false y decrementa attemptsLeft', async ({
    request,
  }) => {
    const { otpId } = await (
      await request.post(`${API_BASE}/otp/request`, { data: { email: uniqueTestEmail() } })
    ).json();

    const res = await request.post(`${API_BASE}/otp/validate`, {
      data: { otpId, code: '000000' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: 'invalid', attemptsLeft: 2 });
  });

  test('PCGL-3246 — tras 3 intentos fallidos: attemptsLeft:0 y resendEnabled:true (CA6a)', async ({
    request,
  }) => {
    const { otpId } = await (
      await request.post(`${API_BASE}/otp/request`, { data: { email: uniqueTestEmail() } })
    ).json();

    let lastBody;
    for (let attempt = 1; attempt <= 3; attempt++) {
      lastBody = await (
        await request.post(`${API_BASE}/otp/validate`, { data: { otpId, code: '000000' } })
      ).json();
    }

    expect(lastBody).toMatchObject({
      valid: false,
      status: 'invalid',
      attemptsLeft: 0,
      resendEnabled: true,
    });
  });

  test('PCGL-3247 — resend válido genera nuevo otpId y resendsLeft decrementado (CA7)', async ({
    request,
  }) => {
    const email = uniqueTestEmail();
    const { otpId } = await (
      await request.post(`${API_BASE}/otp/request`, { data: { email } })
    ).json();

    const res = await request.post(`${API_BASE}/otp/resend`, { data: { email, otpId } });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.otpId).not.toBe(otpId);
    expect(body).toMatchObject({ resendsLeft: 2 });
  });

  test('PCGL-3248 — al agotar los 3 reenvíos, el siguiente incluye blockedUntil ≈ +3h (CA6b)', async ({
    request,
  }) => {
    const email = uniqueTestEmail();
    let { otpId } = await (
      await request.post(`${API_BASE}/otp/request`, { data: { email } })
    ).json();

    for (let resend = 1; resend <= 3; resend++) {
      ({ otpId } = await (
        await request.post(`${API_BASE}/otp/resend`, { data: { email, otpId } })
      ).json());
    }

    const res = await request.post(`${API_BASE}/otp/resend`, { data: { email, otpId } });
    const body = await res.json();

    expect(body.blockedUntil).toBeTruthy();
    const minutesFromNow = (new Date(body.blockedUntil).getTime() - Date.now()) / 60000;
    expect(minutesFromNow).toBeGreaterThan(170);
    expect(minutesFromNow).toBeLessThan(190);
  });

  test('PCGL-2898 — E5 (CA5): OTP expirado retorna status:expired y resendEnabled:true', async ({
    request,
  }) => {
    const { otpId, code } = await (
      await request.post(`${API_BASE}/_test/otp`, {
        data: { email: uniqueTestEmail(), expired: true },
      })
    ).json();

    const res = await request.post(`${API_BASE}/otp/validate`, { data: { otpId, code } });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ valid: false, status: 'expired', resendEnabled: true });
  });
});
