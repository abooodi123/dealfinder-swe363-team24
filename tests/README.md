# Browser tests

Owner: Member 4 (Administrator Portal and Quality).

`test_admin.py` opens the running app in Chromium with [Playwright](https://playwright.dev/python/) and checks:

| Area | Checks |
|---|---|
| Access control | Guests are sent to Log in; a shopper sees Access denied on `/admin` |
| FR17 Submissions | Dashboard list; approve a new store (appears on Explore); approving one claim rejects the competing claim; Request changes and Reject validation |
| FR18–FR20 Catalog | Add store with duplicate-website error; edit shows on the store page; disable / restore / delete (delete needs the store name) |
| FR21 Categories | Duplicate name error, add with icon, reorder, delete asks where to move stores |
| FR22 Moderation | Hide removes the review from the store page; Keep dismisses reports |
| FR23 Featured | Schedule a store for Home; coupon slot rules |
| FR24 Analytics | Custom date validation; CSV export follows the category filter |
| FR16 Support | Admin reply is saved and confirmed |
| Quality | Requirements guide search; every admin page fits a 375 px screen; no JavaScript errors |

## Run

```bash
pip install playwright
python -m playwright install chromium
npm run dev                                                    # terminal 1
DEALFINDER_URL=http://localhost:5173 python tests/test_admin.py  # terminal 2
```

Each check starts from fresh demo data. On Linux with a system Chromium, add `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium`.
Last result: **20/20 checks passed**.
