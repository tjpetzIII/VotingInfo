# Research: VOT-63

Google Civic voterInfoQuery documents `pollingLocations`, `earlyVoteSites`, `dropOffLocations`, `mailOnly`, address metadata, polling hours, start/end dates, and location services. The existing geocoder already provides Census-first lookup and paced Nominatim fallback; retaining that service avoids new external behavior.
