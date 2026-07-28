import type { MessageKey } from "./en";

const messages: Record<MessageKey, string> = {
  "nav.allElections": "Todas las Elecciones",
  "nav.voterInfo": "Información del Votante",
  "nav.dates": "Fechas Clave",
  "header.tagline": "— Tu guía de información electoral",
  "footer.copyright": "© {year} VoteReady. Empoderando votantes en todas partes.",

  "home.title": "Todas las Elecciones",
  "home.subtitle": "Elecciones disponibles de la API de Información Cívica de Google.",
  "home.loadError": "No se pudieron cargar las elecciones.",

  "voterInfo.title": "Encuentra Tu Información de Votante",
  "voterInfo.subtitle":
    "Ingresa tu dirección para encontrar centros de votación, plazos de registro y más.",
  "voterInfo.submit": "Buscar Información de Votante",
  "voterInfo.registrationSection": "Información de Registro",
  "voterInfo.submitting": "Buscando…",
  "voterInfo.electionDay": "Día de elección: {day}",
  "voterInfo.pollingLocations": "Centros de Votación",
  "voterInfo.contests": "Contiendas",
  "voterInfo.unknownOffice": "Cargo Desconocido",

  "elections.title": "Contiendas y Candidatos",
  "elections.subtitle":
    "Ingresa tu dirección para ver qué hay en tu boleta y quién participa.",
  "elections.placeholder": "ej. 123 Main St, Austin, TX 78701",
  "elections.search": "Buscar",
  "elections.electionLabel": "Elección",
  "elections.share": "Compartir esta elección",
  "elections.copied": "¡Copiado!",
  "elections.noContests": "No se encontraron contiendas para esta dirección.",
  "elections.viewCandidates": "Ver candidatos \u2192",
  "elections.unnamedContest": "Contienda sin nombre",
  "elections.candidateCount":
    "{count, plural, one {# candidato} other {# candidatos}}",

  "contest.noAddress": "No se proporcionó dirección.",
  "contest.searchContests": "Buscar contiendas",
  "contest.notFound": "Contienda no encontrada.",
  "contest.backToContests": "Volver a contiendas",
  "contest.allContests": "\u2190 Todas las contiendas",
  "contest.defaultTitle": "Contienda",
  "contest.noCandidates": "No hay información de candidatos disponible.",

  "candidate.contactInfo": "Información de contacto",
  "candidate.phone": "Teléfono:",
  "candidate.email": "Correo:",

  "addressForm.streetLabel": "Dirección",
  "addressForm.streetPlaceholder": "ej. 123 Main St",
  "addressForm.cityLabel": "Ciudad",
  "addressForm.cityPlaceholder": "ej. Austin",
  "addressForm.stateLabel": "Estado",
  "addressForm.statePlaceholder": "ej. TX",
  "addressForm.zipLabel": "Código Postal",
  "addressForm.zipPlaceholder": "ej. 78701",
  "addressForm.fillAllFields": "Por favor completa todos los campos.",
  "addressForm.stateError": "El estado debe tener 2 letras.",
  "addressForm.zipError": "El código postal debe tener 5 dígitos.",

  "registration.statusOpen": "Recursos de registro disponibles",
  "registration.statusUnavailable": "Datos de registro no disponibles",
  "registration.deadline": "Fecha Límite de Registro",
  "registration.registerNow": "Registrarse para Votar",
  "registration.checkRegistration": "Verificar Tu Registro",
  "registration.adminName": "Administración Electoral",
  "registration.officials": "Funcionarios Electorales",
  "registration.noData":
    "La información de registro no está disponible para tu ubicación a través de este servicio. Visita el sitio web oficial de elecciones de tu estado para registrarte.",
  "registration.stateInfo": "Información de Registro Estatal",
  "registration.onlineYes": "Registro en línea disponible",
  "registration.onlineNo": "Registro en línea no disponible",
  "registration.sameDayYes": "Registro el día de las elecciones disponible",
  "registration.sameDayNo": "Registro el día de las elecciones no disponible",
  "registration.electionInfo": "Información Electoral",
  "registration.absenteeInfo": "Voto en Ausencia / Por Correo",
  "registration.findPollingPlace": "Encontrar Centro de Votación",
  "registration.ballotInfo": "Boleta de Muestra",
  "registration.electionRules": "Reglas Electorales",
  "registration.voterServices": "Servicios al Votante",
  "registration.hours": "Horario de Oficina",
  "registration.mailingAddress": "Dirección Postal",
  "registration.physicalAddress": "Dirección Física",
  "registration.fax": "Fax:",
  "registration.usefulLinks": "Enlaces Útiles",

  "dates.title": "Fechas Clave y Plazos",
  "dates.subtitle":
    "Ingresa tu dirección para ver todas las fechas importantes de tu próxima elección.",
  "dates.submit": "Buscar Mis Fechas",
  "dates.submitting": "Buscando…",
  "dates.noResults": "No se encontraron fechas clave para esta dirección todavía.",
  "dates.nextUpToday": "⚡ ¡Hoy!",
  "dates.nextUpIn": "⚡ Faltan {days, plural, one {# día} other {# días}}",
  "dates.pastLabel": "Pasada",
  "dates.category.election_day": "Día de la Elección",
  "dates.category.registration_deadline": "Fecha Límite de Registro",
  "dates.category.mail_in_request_deadline": "Fecha Límite para Solicitar Boleta por Correo",
  "dates.category.mail_in_return_deadline": "Fecha Límite para Devolver Boleta por Correo",
  "dates.category.early_voting_start": "Inicio de Votación Anticipada",
  "dates.category.early_voting_end": "Fin de Votación Anticipada",
  "dates.category.general": "Fecha Importante",
  "dates.explanation.election_day":
    "Este es el Día de la Elección — las urnas están abiertas para que emitas tu voto.",
  "dates.explanation.registration_deadline":
    "Este es el último día para registrarte para votar en esta elección.",
  "dates.explanation.mail_in_request_deadline":
    "Este es el último día para solicitar una boleta por correo o en ausencia.",
  "dates.explanation.mail_in_return_deadline":
    "Esta es la fecha límite para que tu boleta por correo sea recibida o matasellada.",
  "dates.explanation.early_voting_start":
    "Los centros de votación anticipada abren en esta fecha.",
  "dates.explanation.early_voting_end":
    "Este es el último día para votar de forma anticipada en persona.",
  "dates.explanation.general":
    "Una fecha importante en el calendario electoral de tu área.",

  "notFound.title": "Página no encontrada",
  "notFound.description": "La página que buscas no existe.",
  "notFound.goHome": "Ir al inicio",

  "loading.text": "Cargando tu información de votante...",

  "error.title": "Algo salió mal",
  "error.defaultMessage":
    "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
  "error.tryAgain": "Intentar de nuevo",
};

export default messages;
