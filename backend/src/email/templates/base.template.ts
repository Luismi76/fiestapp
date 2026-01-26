/**
 * Template base para todos los emails de FiestApp
 * Proporciona el layout común con header y footer
 */

export interface BaseTemplateOptions {
  title: string;
  preheader?: string;
  headerGradient?: 'primary' | 'orange' | 'green' | 'red' | 'purple';
  headerSubtitle?: string;
}

const gradients = {
  primary: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
  orange: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  green: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  red: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
};

const buttonColors = {
  primary: {
    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    shadow: 'rgba(37, 99, 235, 0.4)',
  },
  orange: {
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    shadow: 'rgba(249, 115, 22, 0.4)',
  },
  green: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: 'rgba(16, 185, 129, 0.4)',
  },
  red: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    shadow: 'rgba(239, 68, 68, 0.4)',
  },
  purple: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    shadow: 'rgba(139, 92, 246, 0.4)',
  },
};

export function getBaseTemplate(
  content: string,
  options: BaseTemplateOptions,
): string {
  const gradient = gradients[options.headerGradient || 'primary'];
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title}</title>
  ${options.preheader ? `<meta name="description" content="${options.preheader}">` : ''}
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 20px !important; }
      .button { padding: 14px 30px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  ${options.preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${options.preheader}</div>` : ''}
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" class="container" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: ${gradient}; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">FiestApp</h1>
              <p style="color: rgba(255, 255, 255, 0.8); margin: 10px 0 0; font-size: 14px;">
                ${options.headerSubtitle || 'Vive las fiestas como un local'}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding-bottom: 15px;">
                    <a href="https://fiestapp.com" style="color: #6b7280; text-decoration: none; margin: 0 10px; font-size: 13px;">Inicio</a>
                    <a href="https://fiestapp.com/experiences" style="color: #6b7280; text-decoration: none; margin: 0 10px; font-size: 13px;">Experiencias</a>
                    <a href="https://fiestapp.com/help" style="color: #6b7280; text-decoration: none; margin: 0 10px; font-size: 13px;">Ayuda</a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center;">
                    <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                      &copy; ${year} FiestApp. Todos los derechos reservados.
                    </p>
                    <p style="color: #9ca3af; margin: 8px 0 0; font-size: 11px;">
                      Este email fue enviado desde una direccion que no acepta respuestas.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getButton(
  text: string,
  url: string,
  color: keyof typeof buttonColors = 'primary',
): string {
  const colorConfig = buttonColors[color];
  return `
    <table role="presentation" style="width: 100%; margin: 30px 0;">
      <tr>
        <td style="text-align: center;">
          <a href="${url}" class="button" style="display: inline-block; padding: 16px 40px; background: ${colorConfig.background}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 14px ${colorConfig.shadow};">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function getInfoBox(
  content: string,
  variant: 'warning' | 'success' | 'info' | 'error' = 'info',
): string {
  const variants = {
    warning: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      titleColor: '#92400e',
      textColor: '#78350f',
    },
    success: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      titleColor: '#065f46',
      textColor: '#047857',
    },
    info: {
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      titleColor: '#1e40af',
      textColor: '#1d4ed8',
    },
    error: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      titleColor: '#991b1b',
      textColor: '#b91c1c',
    },
  };

  const v = variants[variant];
  return `
    <div style="background: ${v.background}; border-radius: 12px; padding: 20px; margin: 20px 0; color: ${v.textColor};">
      ${content}
    </div>
  `;
}

export function getDivider(): string {
  return '<div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;"></div>';
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount);
}
