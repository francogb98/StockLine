interface PasswordResetEmailHtmlParams {
  resetUrl: string;
  appUrl: string;
}

const FONT_FAMILY =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function passwordResetEmailHtml({
  resetUrl,
  appUrl,
}: PasswordResetEmailHtmlParams): string {
  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #F8FAFC;">
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background-color: #F8FAFC; padding: 40px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0;"
          >
            <tr>
              <td align="center" style="padding: 32px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align: middle; padding-right: 8px;">
                      <img
                        src="https://stockline.app/icon.svg"
                        alt="StockLine"
                        width="36"
                        height="36"
                        style="display: block; border: 0;"
                      />
                    </td>
                    <td
                      style="vertical-align: middle; font-family: ${FONT_FAMILY}; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.02em;"
                    >
                      StockLine
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 32px 0 32px;">
                <h1
                  style="margin: 0; font-family: ${FONT_FAMILY}; font-size: 24px; font-weight: 700; color: #0F172A;"
                >
                  ¿Olvidaste tu contraseña?
                </h1>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 16px 32px 0 32px;">
                <p
                  style="margin: 0; font-family: ${FONT_FAMILY}; font-size: 15px; line-height: 1.6; color: #64748B;"
                >
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el botón para crear una nueva contraseña.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 32px 0 32px;">
                <a
                  href="${resetUrl}"
                  style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-family: ${FONT_FAMILY}; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;"
                >
                  Restablecer contraseña
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 24px 32px 0 32px;">
                <p
                  style="margin: 0; font-family: ${FONT_FAMILY}; font-size: 14px; line-height: 1.6; color: #64748B;"
                >
                  Este enlace expira en 1 hora. Si no solicitaste este cambio, podés ignorar este correo.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 16px 32px 0 32px;">
                <p
                  style="margin: 0; font-family: ${FONT_FAMILY}; font-size: 13px; line-height: 1.6; color: #64748B;"
                >
                  Si el botón no funciona, copiá y pegá este enlace en tu navegador:
                </p>
                <p
                  style="margin: 4px 0 0 0; font-family: ${FONT_FAMILY}; font-size: 13px; word-break: break-all;"
                >
                  <a href="${resetUrl}" style="color: #2563EB; text-decoration: underline;">${resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 32px 32px 24px 32px; border-top: 1px solid #E2E8F0; margin-top: 24px;">
                <p
                  style="margin: 0; font-family: ${FONT_FAMILY}; font-size: 12px; line-height: 1.6; color: #94A3B8;"
                >
                  © 2026 StockLine · App de gestión para tu negocio
                </p>
                <p
                  style="margin: 4px 0 0 0; font-family: ${FONT_FAMILY}; font-size: 12px; line-height: 1.6; color: #94A3B8;"
                >
                  Si no solicitaste este correo, ignorá este mensaje.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
