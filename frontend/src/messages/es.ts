import type { MessageKey } from "./en";

const messages: Record<MessageKey, string> = {
  "nav.allElections": "Todas las Elecciones",
  "nav.voterInfo": "Información del Votante",
  "header.tagline": "— Tu guía de información electoral",
  "footer.copyright": "© {year} VoteReady. Empoderando votantes en todas partes.",

  "home.title": "Todas las Elecciones",
  "home.subtitle": "Elecciones disponibles de la API de Información Cívica de Google.",
  "home.loadError": "No se pudieron cargar las elecciones.",

  "voterInfo.title": "Encuentra Tu Información de Votante",
  "voterInfo.subtitle":
    "Ingresa tu dirección para encontrar centros de votación, boletas de muestra y más.",
  "voterInfo.streetLabel": "Dirección",
  "voterInfo.streetPlaceholder": "ej. 123 Main St",
  "voterInfo.cityLabel": "Ciudad",
  "voterInfo.cityPlaceholder": "ej. Austin",
  "voterInfo.stateLabel": "Estado",
  "voterInfo.statePlaceholder": "ej. TX",
  "voterInfo.zipLabel": "Código Postal",
  "voterInfo.zipPlaceholder": "ej. 78701",
  "voterInfo.submit": "Encontrar Mi Información de Votación",
  "voterInfo.submitting": "Buscando…",
  "voterInfo.fillAllFields": "Por favor completa todos los campos.",
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
