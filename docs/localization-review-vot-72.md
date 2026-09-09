# VOT-72 localization review

Route inventory: `/`, `/dates`, `/elections`, `/polling`, `/voter-info`, `/ballot`, and shared Header, Footer, AddressForm, ElectionChooser, polling cards/map, and data-source/error states.

Review rules:

- App-authored labels, loading, empty, error, validation, clipboard, map accessible names, and fallback labels require keys in both message maps.
- Election names, candidate names, addresses, and official upstream election/source prose remain verbatim.
- Date and number formatting uses the selected `react-intl` locale, including when the browser locale is `en-US`.
- Verify Spanish expansion at 375px and screen-reader announcements with `document.documentElement.lang = "es"`.

Terminology reference: EAC Language Access Resources, https://www.eac.gov/language-access-resources.

Manual release checks: switch language while an address and election are selected; reload with each locale; deny or corrupt localStorage; confirm no unrelated fetch; inspect deadline distinctions and category empty/error states.
