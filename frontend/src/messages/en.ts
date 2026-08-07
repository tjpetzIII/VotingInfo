const messages = {
  "nav.allElections": "All Elections",
  "nav.voterInfo": "Voter Info",
  "nav.dates": "Key Dates",
  "nav.sampleBallot": "Sample Ballot",
  "header.tagline": "— Your voter information guide",
  "footer.copyright": "© {year} VoteReady. Empowering voters everywhere.",

  "home.title": "All Elections",
  "home.subtitle": "Available elections from the Google Civic Information API.",
  "home.loadError": "Failed to load elections.",

  "voterInfo.title": "Find Your Voter Info",
  "voterInfo.subtitle":
    "Enter your address to find polling locations, registration deadlines, and more.",
  "voterInfo.submit": "Look Up Voter Info",
  "voterInfo.registrationSection": "Registration Info",
  "voterInfo.submitting": "Looking up…",
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
  "contest.candidatesHeading": "Candidates",

  "candidate.contactInfo": "Contact info",
  "candidate.phone": "Phone:",
  "candidate.email": "Email:",
  "candidate.campaignFinance": "Campaign Finance",
  "candidate.totalRaised": "Total raised",
  "candidate.totalSpent": "Total spent",
  "candidate.cashOnHand": "Cash on hand",
  "candidate.financeAsOf": "As of {date}",
  "candidate.topContributors": "Top Contributors",

  "ballot.title": "Sample Ballot",
  "ballot.subtitle": "Enter your address to see your full ballot, grouped by level.",
  "ballot.placeholder": "e.g. 123 Main St, Austin, TX 78701",
  "ballot.search": "Search",
  "ballot.submitting": "Looking up…",
  "ballot.loadError": "Failed to load your sample ballot.",
  "ballot.sectionFederal": "Federal",
  "ballot.sectionState": "State",
  "ballot.sectionLocal": "Local",
  "ballot.noBallotData": "No sample ballot is available for this address yet.",
  "ballot.contestFallbackLabel": "Contest",
  "ballot.noCandidatesFound": "No candidates found",
  "ballot.toggleSection": "Toggle {level} section",
  "ballot.backToBallot": "← Back to ballot",
  "ballot.contestNotFound": "This contest could not be found.",
  "ballot.noAddress": "No address provided.",
  "ballot.searchBallot": "Search for your ballot",
  "ballot.share": "Share",
  "ballot.linkCopied": "Link copied!",
  "ballot.shareCopyFailed": "Couldn't copy the link automatically — copy it manually:",

  "electionType.toggle": "Toggle election type explainer",
  "electionType.primary.title": "This is a Primary Election",
  "electionType.primary.explanation":
    "Voters choose which candidates will represent each party in the general election. Depending on your state's rules, you may need to be registered with a party to vote in its primary.",
  "electionType.general.title": "This is a General Election",
  "electionType.general.explanation":
    "All registered voters can vote for any candidate in each race. The winners take office.",
  "electionType.special.title": "This is a Special Election",
  "electionType.special.explanation":
    "This election is being held outside the normal election calendar, often to fill a vacancy or decide a specific issue before the next general election.",
  "electionType.runoff.title": "This is a Runoff Election",
  "electionType.runoff.explanation":
    "No candidate in an earlier race got enough votes to win outright, so voters are choosing between the top finishers from that race.",
  "electionType.generic.title": "About This Ballot",
  "electionType.generic.explanation":
    "This sample ballot shows the contests and candidates for your address for this election.",

  "addressForm.streetLabel": "Street Address",
  "addressForm.streetPlaceholder": "e.g. 123 Main St",
  "addressForm.cityLabel": "City",
  "addressForm.cityPlaceholder": "e.g. Austin",
  "addressForm.stateLabel": "State",
  "addressForm.statePlaceholder": "e.g. TX",
  "addressForm.zipLabel": "ZIP Code",
  "addressForm.zipPlaceholder": "e.g. 78701",
  "addressForm.fillAllFields": "Please fill in all fields.",
  "addressForm.stateError": "State must be 2 letters.",
  "addressForm.zipError": "ZIP must be 5 digits.",

  "registration.statusOpen": "Registration resources available",
  "registration.statusUnavailable": "Registration data not available",
  "registration.deadline": "Registration Deadline",
  "registration.registerNow": "Register to Vote",
  "registration.checkRegistration": "Check Your Registration",
  "registration.adminName": "Election Administration",
  "registration.officials": "Election Officials",
  "registration.noData":
    "Registration information is not available for your location through this service. Visit your state's official election website to register.",
  "registration.stateInfo": "State Registration Info",
  "registration.onlineYes": "Online registration available",
  "registration.onlineNo": "Online registration not available",
  "registration.sameDayYes": "Same-day registration available",
  "registration.sameDayNo": "Same-day registration not available",
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

  "dates.title": "Key Dates & Deadlines",
  "dates.subtitle":
    "Enter your address to see every important date for your upcoming election.",
  "dates.submit": "Find My Dates",
  "dates.submitting": "Looking up…",
  "dates.noResults": "No key dates found for this address yet.",
  "dates.nextUpToday": "⚡ Today!",
  "dates.nextUpIn": "⚡ Coming up in {days, plural, one {# day} other {# days}}",
  "dates.pastLabel": "Past",
  "dates.category.election_day": "Election Day",
  "dates.category.registration_deadline": "Registration Deadline",
  "dates.category.mail_in_request_deadline": "Mail-In Ballot Request Deadline",
  "dates.category.mail_in_return_deadline": "Mail-In Ballot Return Deadline",
  "dates.category.early_voting_start": "Early Voting Begins",
  "dates.category.early_voting_end": "Early Voting Ends",
  "dates.category.general": "Important Date",
  "dates.explanation.election_day":
    "This is Election Day — polls are open for you to cast your ballot.",
  "dates.explanation.registration_deadline":
    "This is the last day to register to vote for this election.",
  "dates.explanation.mail_in_request_deadline":
    "This is the last day to request a mail-in or absentee ballot.",
  "dates.explanation.mail_in_return_deadline":
    "This is the deadline for your mail-in ballot to be received or postmarked.",
  "dates.explanation.early_voting_start":
    "Early voting locations open on this date.",
  "dates.explanation.early_voting_end":
    "This is the last day to vote early in person.",
  "dates.explanation.general":
    "An important date on the election calendar for your area.",

  "notFound.title": "Page not found",
  "notFound.description": "The page you're looking for doesn't exist.",
  "notFound.goHome": "Go home",
  "notFound.helpfulLinks": "Or try one of these:",
  "notFound.linkAllElections": "All Elections",
  "notFound.linkVoterInfo": "Voter Info",
  "notFound.linkRegistrationDates": "Registration Dates",
  "notFound.linkKeyDates": "Key Dates",

  "loading.text": "Loading your voter information...",

  "addressSummary.using": "Using: {address}",
  "addressSummary.change": "Change",
  "addressSummary.save": "Save",
  "addressSummary.cancel": "Cancel",

  "error.title": "Something went wrong",
  "error.defaultMessage":
    "An unexpected error occurred. Please try again.",
  "error.tryAgain": "Try Again",
} as const;

export type MessageKey = keyof typeof messages;
export default messages;
