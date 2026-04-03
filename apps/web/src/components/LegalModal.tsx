import React from 'react';
import OverlayModal from './OverlayModal';
import { ModalPanel } from './ui';

export type LegalPage = 'privacy' | 'terms' | 'cookies' | 'faq';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-[var(--text-primary)]">
        {title}
      </h3>
      <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">{children}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-[0.9rem] border bg-[var(--surface-card)] p-4 [border-color:var(--line-soft)]">
      <p className="text-[13px] font-bold text-[var(--text-primary)]">{q}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{a}</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="mb-5 text-xs text-[var(--text-secondary)]">Última actualización: enero de 2025</p>

      <Section title="Información que recopilamos">
        <p>
          Recopilamos únicamente la información necesaria para brindarte el servicio: nombre,
          dirección de correo electrónico y preferencias de cuenta que introduces directamente en
          la plataforma. No vendemos ni compartimos tus datos personales con terceros no autorizados.
        </p>
      </Section>

      <Section title="Cómo usamos tu información">
        <p>Usamos tus datos exclusivamente para:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Identificarte y gestionar tu sesión de forma segura.</li>
          <li>Almacenar tus contactos (partners), tareas y configuración de CRM.</li>
          <li>Enviarte comunicaciones relacionadas con el servicio cuando sea necesario.</li>
        </ul>
      </Section>

      <Section title="Autenticación con Google (OAuth)">
        <p>
          Si inicias sesión con Google, recibimos tu nombre, dirección de correo electrónico y
          foto de perfil públicos según los permisos que concedes. No accedemos a tu historial de
          correo, contactos de Google ni ningún otro dato fuera del alcance autorizado. Puedes
          revocar el acceso en cualquier momento desde tu cuenta de Google.
        </p>
      </Section>

      <Section title="Almacenamiento y seguridad">
        <p>
          Tus datos se almacenan en servidores seguros proporcionados por Supabase (PostgreSQL).
          Cada cuenta tiene aislamiento estricto: ningún usuario puede acceder a los datos de otro.
          Las contraseñas se almacenan cifradas con bcrypt y nunca en texto plano.
        </p>
      </Section>

      <Section title="Cookies y sesiones">
        <p>
          Utilizamos cookies de sesión imprescindibles para mantenerte autenticado. No usamos
          cookies de seguimiento publicitario ni de terceros. Consulta nuestra Política de Cookies
          para más detalle.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Tienes derecho a acceder, rectificar y eliminar tus datos personales en cualquier
          momento. Para ejercer estos derechos, escríbenos a{' '}
          <strong className="text-[var(--text-primary)]">soporte@efi.app</strong>.
        </p>
      </Section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="mb-5 text-xs text-[var(--text-secondary)]">Última actualización: enero de 2025</p>

      <Section title="Aceptación de los términos">
        <p>
          Al crear una cuenta y usar Tía, aceptas estos Términos y Condiciones. Si no estás de
          acuerdo, no debes usar el servicio.
        </p>
      </Section>

      <Section title="Descripción del servicio">
        <p>
          Tía es una plataforma de CRM personal diseñada para creadores de contenido e
          influencers. Permite gestionar relaciones con marcas y colaboradores, hacer seguimiento
          de campañas y organizar tareas. Es un espacio personal — no existe colaboración entre
          cuentas.
        </p>
      </Section>

      <Section title="Uso aceptable">
        <p>Te comprometes a no:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Usar el servicio para actividades ilegales o fraudulentas.</li>
          <li>Intentar acceder a cuentas o datos de otros usuarios.</li>
          <li>Introducir código malicioso o intentar comprometer la seguridad de la plataforma.</li>
          <li>Revender o redistribuir el servicio sin autorización expresa.</li>
        </ul>
      </Section>

      <Section title="Cuenta de usuario">
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales y de todas las
          actividades que ocurran bajo tu cuenta. Notifícanos de inmediato ante cualquier uso no
          autorizado.
        </p>
      </Section>

      <Section title="Propiedad intelectual">
        <p>
          El software, diseño y marca de Tía son propiedad de sus creadores y están protegidos por
          las leyes de propiedad intelectual. Tus datos y contenidos siguen siendo tuyos.
        </p>
      </Section>

      <Section title="Limitación de responsabilidad">
        <p>
          Tía se proporciona «tal cual», sin garantías de disponibilidad continua. No somos
          responsables de pérdidas de datos derivadas de fallos técnicos imprevisibles. Recomendamos
          exportar tus datos periódicamente.
        </p>
      </Section>

      <Section title="Modificaciones y terminación">
        <p>
          Podemos modificar estos términos con previo aviso. El uso continuado del servicio tras
          los cambios implica su aceptación. Puedes cancelar tu cuenta en cualquier momento desde
          Configuración.
        </p>
      </Section>
    </>
  );
}

function CookiesContent() {
  return (
    <>
      <p className="mb-5 text-xs text-[var(--text-secondary)]">Última actualización: enero de 2025</p>

      <Section title="¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que un sitio web almacena en tu dispositivo
          cuando lo visitas. Se usan para recordar información sobre tu sesión y preferencias.
        </p>
      </Section>

      <Section title="Cookies que usamos">
        <div className="space-y-3">
          <div className="rounded-[0.9rem] border bg-[var(--surface-card)] p-4 [border-color:var(--line-soft)]">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              Cookies de sesión (imprescindibles)
            </p>
            <p className="mt-1 text-sm leading-6">
              Permiten que el servidor identifique tu sesión activa. Sin ellas no puedes iniciar
              sesión. Expiran al cerrar el navegador o al cerrar sesión manualmente.
            </p>
          </div>
          <div className="rounded-[0.9rem] border bg-[var(--surface-card)] p-4 [border-color:var(--line-soft)]">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              Almacenamiento local (preferencias)
            </p>
            <p className="mt-1 text-sm leading-6">
              Guardamos localmente en tu navegador preferencias como el color de acento, el tema
              claro/oscuro y si ya viste el tutorial inicial. No se envían a terceros.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Cookies de terceros">
        <p>
          Si inicias sesión con Google, Google puede establecer sus propias cookies de
          autenticación. Estas están sujetas a la{' '}
          <strong className="text-[var(--text-primary)]">Política de Privacidad de Google</strong>.
          Tía no establece ninguna cookie de publicidad, analítica de terceros ni rastreo.
        </p>
      </Section>

      <Section title="Cómo gestionar las cookies">
        <p>
          Puedes configurar tu navegador para bloquear o eliminar cookies en cualquier momento.
          Ten en cuenta que bloquear las cookies de sesión impedirá el funcionamiento correcto
          del inicio de sesión. Consulta la documentación de tu navegador para instrucciones
          específicas.
        </p>
      </Section>
    </>
  );
}

function FaqContent() {
  const items = [
    {
      q: '¿Qué es Tía?',
      a: 'Tía es un CRM personal para creadores de contenido e influencers. Te ayuda a gestionar tus colaboraciones con marcas, hacer seguimiento de campañas y mantener tus contactos organizados en un solo lugar.',
    },
    {
      q: '¿Cómo agrego un nuevo partner o colaboración?',
      a: 'Ve a la sección "Directorio" o "Pipeline" y pulsa el botón de añadir. Puedes registrar datos del partner (marca, contacto, red social) y crear una colaboración con su estado y fechas.',
    },
    {
      q: '¿Qué significan los estados del pipeline?',
      a: 'El pipeline sigue este flujo: Pendiente → En Progreso → En Revisión → Completada → Cobrado. Cada estado refleja en qué punto se encuentra una colaboración o entregable.',
    },
    {
      q: '¿Mis datos son privados?',
      a: 'Sí. Tu cuenta es completamente privada — ningún otro usuario puede ver tus datos. Cada cuenta tiene aislamiento estricto en la base de datos. Consulta la Política de Privacidad para más detalle.',
    },
    {
      q: '¿Puedo cambiar el tema o los colores de la interfaz?',
      a: 'Sí. Ve a Configuración para cambiar entre tema claro y oscuro, y elige tu color de acento preferido entre más de 20 opciones.',
    },
    {
      q: '¿Cómo puedo cerrar o eliminar mi cuenta?',
      a: 'Puedes cerrar sesión desde el botón de la barra lateral. Para eliminar tu cuenta y todos tus datos, escríbenos a soporte@efi.app y lo gestionamos en 48 horas.',
    },
    {
      q: '¿Tía funciona en el móvil?',
      a: 'Sí. La interfaz está optimizada para escritorio y móvil. En dispositivos pequeños verás la navegación en la parte inferior de la pantalla.',
    },
    {
      q: '¿Cómo contacto con soporte?',
      a: 'Escríbenos a soporte@efi.app. Respondemos en un plazo de 1–2 días hábiles.',
    },
  ];

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i}>
          <FaqItem q={item.q} a={item.a} />
        </div>
      ))}
    </div>
  );
}

const pageConfig: Record<LegalPage, { title: string; content: React.ReactNode }> = {
  privacy: { title: 'Política de Privacidad', content: <PrivacyContent /> },
  terms: { title: 'Términos y Condiciones', content: <TermsContent /> },
  cookies: { title: 'Política de Cookies', content: <CookiesContent /> },
  faq: { title: 'Preguntas Frecuentes', content: <FaqContent /> },
};

export default function LegalModal({
  page,
  onClose,
}: {
  page: LegalPage;
  onClose: () => void;
}) {
  const { title, content } = pageConfig[page];

  return (
    <OverlayModal onClose={onClose}>
      <ModalPanel title={title} onClose={onClose} size="md">
        {content}
      </ModalPanel>
    </OverlayModal>
  );
}
