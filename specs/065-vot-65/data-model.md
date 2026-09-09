# Data Model

`DeadlineAction`: received, postmarked, submitted, unknown. `VotingMethod`: online, mail, in_person, unknown. A deadline carries stable ID, optional election ID, jurisdiction, method/action, local date, optional cutoff and IANA timezone, original wording, and provenance. Legacy date-only records serialize with unknown action/method and no cutoff.
