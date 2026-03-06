# Changelog

## 2026-03-06

### Commit 1
- Fixed mobile overflow issues on Today by removing horizontal bleed in the research lane strip and forcing page content to stay within viewport width.
- Switched bottom navigation from absolute positioning to a sticky floating bar inside the scroll container so it stays visible at the bottom while scrolling.
- Removed the Today "Consistency" section to keep the page focused on quick daily overview.
- Updated Today nutrition rendering to schema-aligned fields and display: `name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fats_g` in a mobile-safe list layout.

### Commit 2
- Removed the Research page task board section to simplify the page.
- Reworked manual paper entry into a dedicated drawer opened via a single `Manual Entry` button.
- Kept the main Research surface focused on arXiv import, filters, and the paper log table.

### Commit 3
- Updated the You page header area to show a profile avatar circle with the user name/email-prefix and account email.
- Moved sync/account actions next to the profile block, including `Sync Account`, sign-in/sign-out, and queue status.
- Removed the Sunday Planning section from the You page.
