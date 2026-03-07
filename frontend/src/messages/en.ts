const messages = {
  "nav.allElections": "All Elections",
  "nav.voterInfo": "Voter Info",
  "header.tagline": "— Your voter information guide",
  "footer.copyright": "© {year} VoteReady. Empowering voters everywhere.",

  "home.title": "All Elections",
  "home.subtitle": "Available elections from the Google Civic Information API.",
  "home.loadError": "Failed to load elections.",

  "voterInfo.title": "Find Your Voter Info",
  "voterInfo.subtitle":
    "Enter your address to find polling locations, sample ballots, and more.",
  "voterInfo.streetLabel": "Street Address",
  "voterInfo.streetPlaceholder": "e.g. 123 Main St",
  "voterInfo.cityLabel": "City",
  "voterInfo.cityPlaceholder": "e.g. Austin",
  "voterInfo.stateLabel": "State",
  "voterInfo.statePlaceholder": "e.g. TX",
  "voterInfo.zipLabel": "ZIP Code",
  "voterInfo.zipPlaceholder": "e.g. 78701",
  "voterInfo.submit": "Find My Polling Info",
  "voterInfo.submitting": "Looking up…",
  "voterInfo.fillAllFields": "Please fill in all fields.",
  "voterInfo.electionDay": "Election day: {day}",
  "voterInfo.pollingLocations": "Polling Locations",
  "voterInfo.contests": "Contests",
  "voterInfo.unknownOffice": "Unknown Office",

  "elections.title": "Contests & Candidates",
  "elections.subtitle":
    "Enter your address to see what's on your ballot and who's running.",
  "elections.placeholder": "e.g. 123 Main St, Austin, TX 78701",
  "elections.search": "Search",
  "elections.electionLabel": "Election",
  "elections.share": "Share this election",
  "elections.copied": "Copied!",
  "elections.noContests": "No contests found for this address.",
  "elections.viewCandidates": "View candidates \u2192",
  "elections.unnamedContest": "Unnamed Contest",
  "elections.candidateCount":
    "{count, plural, one {# candidate} other {# candidates}}",

  "contest.noAddress": "No address provided.",
  "contest.searchContests": "Search for contests",
  "contest.notFound": "Contest not found.",
  "contest.backToContests": "Back to contests",
  "contest.allContests": "\u2190 All contests",
  "contest.defaultTitle": "Contest",
  "contest.noCandidates": "No candidate information available.",

  "candidate.contactInfo": "Contact info",
  "candidate.phone": "Phone:",
  "candidate.email": "Email:",

  "nav.registration": "Registration",

  "registration.title": "Voter Registration",
  "registration.subtitle":
    "Enter your address to find registration deadlines, links, and contact info for your state.",
  "registration.submit": "Check Registration",
  "registration.submitting": "Looking up…",
  "registration.fillAllFields": "Please fill in all fields.",
  "registration.streetLabel": "Street Address",
  "registration.streetPlaceholder": "e.g. 123 Main St",
  "registration.cityLabel": "City",
  "registration.cityPlaceholder": "e.g. Austin",
  "registration.stateLabel": "State",
  "registration.statePlaceholder": "e.g. TX",
  "registration.zipLabel": "ZIP Code",
  "registration.zipPlaceholder": "e.g. 78701",
  "registration.statusOpen": "Registration resources available",
  "registration.statusUnavailable": "Registration data not available",
  "registration.deadline": "Registration Deadline",
  "registration.registerNow": "Register to Vote",
  "registration.checkRegistration": "Check Your Registration",
  "registration.adminName": "Election Administration",
  "registration.officials": "Election Officials",
  "registration.noData":
    "Registration information is not available for your location through this service. Visit your state's official election website to register.",
  "registration.electionInfo": "Election Info",
  "registration.absenteeInfo": "Absentee / Mail-in Voting",
  "registration.findPollingPlace": "Find Polling Place",
  "registration.ballotInfo": "Sample Ballot",
  "registration.electionRules": "Election Rules",
  "registration.voterServices": "Voter Services",
  "registration.hours": "Office Hours",
  "registration.mailingAddress": "Mailing Address",
  "registration.physicalAddress": "Physical Address",
  "registration.fax": "Fax:",
  "registration.usefulLinks": "Useful Links",
  "registration.officeContact": "Office Contact",

  "notFound.title": "Page not found",
  "notFound.description": "The page you're looking for doesn't exist.",
  "notFound.goHome": "Go home",

  "loading.text": "Loading your voter information...",

  "error.title": "Something went wrong",
  "error.defaultMessage":
    "An unexpected error occurred. Please try again.",
  "error.tryAgain": "Try Again",
} as const;

export type MessageKey = keyof typeof messages;
export default messages;
