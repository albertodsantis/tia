import { Resend } from 'resend';

let resend: Resend | null = null;

function getClient(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set.');
    resend = new Resend(key);
  }
  return resend;
}

const FROM = 'Efi <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;

  await getClient().emails.send({
    from: FROM,
    to: email,
    subject: 'Recupera tu contraseña – Efi',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 8px;">
          Recupera tu contraseña
        </h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta Efi.
          Este enlace expira en <strong>1 hora</strong>.
        </p>
        <a href="${link}"
           style="display: inline-block; background: linear-gradient(135deg, #f56040, #e1306c, #833ab4);
                  color: white; text-decoration: none; font-weight: 700; font-size: 15px;
                  padding: 14px 28px; border-radius: 12px;">
          Restablecer contraseña
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin: 28px 0 0; line-height: 1.6;">
          Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">Efi — workspace para freelancers</p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerification(
  newEmail: string,
  token: string,
): Promise<void> {
  const link = `${APP_URL}/confirm-email?token=${token}`;

  await getClient().emails.send({
    from: FROM,
    to: newEmail,
    subject: 'Confirma tu nuevo correo – Efi',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 8px;">
          Confirma tu nuevo correo
        </h2>
        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          Haz clic en el botón para confirmar <strong>${newEmail}</strong> como tu nuevo correo en Efi.
          Este enlace expira en <strong>1 hora</strong>.
        </p>
        <a href="${link}"
           style="display: inline-block; background: linear-gradient(135deg, #f56040, #e1306c, #833ab4);
                  color: white; text-decoration: none; font-weight: 700; font-size: 15px;
                  padding: 14px 28px; border-radius: 12px;">
          Confirmar correo
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin: 28px 0 0; line-height: 1.6;">
          Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; margin: 0;">Efi — workspace para freelancers</p>
      </div>
    `,
  });
}
