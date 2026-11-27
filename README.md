# FediFootprint

[Open FediFootprint](https://coolcode.ca/fedifootprint/) or [browse the published records](https://coolcode.ca/fedifootprint/records/).

<!-- coolcode:guide -->
Start with Mastodon in Canada and Germany. Compare its share of hosted servers with its share of monthly active accounts in each country. Change the software, countries or export week, then open a country or software record for its history and the largest reporting server domains.
<!-- /coolcode:guide -->

## Reading the figures

FediDB’s countries export contains counts for a hosting-country and software pair. Within-country shares divide the selected software’s server count or monthly active account count by the respective total for that country in the same export. Software profiles reverse the grouping to show where a project’s servers and active accounts are concentrated. Source country and software labels are kept as published. Similar labels can appear separately. A missing pair has no observation; an explicitly reported zero remains zero.

The server directory export covers listed servers seen by FediDB within 30 days that have at least two accounts. The country export has its own coverage. Its largest-five calculation ranks public server domains by their published monthly active account count and divides their sum by all reported monthly active accounts in that directory cohort. The numerator includes up to five positive values. The page also gives the domains’ share of the directory’s server count, alongside the number of rows with missing activity figures. Missing activity stays unknown. No denominators are mixed between the two files. Hosts can operate several servers; an account can occur on several servers. Hosting location does not determine user residence or provider ownership.

Changes compare the chosen export with the preceding retained export shown on the page. Monthly activity windows overlap; a change in the total is not a count of new people or sign-ups. An edition without a previous snapshot has no change. Each profile retains its latest observed edition if a publisher label disappears.

## Expand or customize

The collector discovers versioned, dated country and server JSON files from the official index. New weekly pairs are added, retained weeks are kept, and a publisher revision replaces just that week after validation. Any incomplete pair, duplicate identity or invalid amount fails the refresh and preserves the last successful archive. All country/software combinations and all geolocated directory cohorts come from these two downloads. The browser never contacts a listed server. Visitor filters remain in the browser URL.

Run `python3 scripts/refresh.py` for a publisher check. The workflow runs Mondays at 09:43 UTC and supports manual dispatch. Run `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests -v` and `python3 scripts/build.py` to rebuild the static site, status, and sitemap. Serve `dist/` under `/fedifootprint/` or open `python3 tests/browser_smoke.py` after installing the browser test requirements. GitHub Pages deploys a tested main build. The independent schedule guard checks the collector and itself.

## Source and licence

Data adapted from [FediDB’s weekly datasets](https://fedidb.com/datasets) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). CoolCode groups and ranks published data, computes ratios and compares editions. The source file URLs and uncompressed JSON SHA-256 digests are retained for every edition. The [source methodology](https://fedidb.com/resources/data-sources) and [reuse terms](https://fedidb.com/platform/terms) describe its coverage and opt-outs. Raw directory rows and individual user accounts are not archived here.
