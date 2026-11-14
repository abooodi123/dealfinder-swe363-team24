"""
Member 4 browser tests: administrator portal (FR17-FR24) and system pages.

Run the app first (npm run dev), then:
    pip install playwright && python -m playwright install chromium
    DEALFINDER_URL=http://localhost:5173 python tests/test_admin.py
"""
import os
import re
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get("DEALFINDER_URL", "http://localhost:5173").rstrip("/")
CHROME = os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")
results = []


def check(name, fn):
    try:
        fn()
        results.append((name, True, ""))
        print("PASS", name)
    except Exception as e:  # noqa: BLE001
        results.append((name, False, str(e).splitlines()[0]))
        print("FAIL", name, "-", str(e).splitlines()[0])


def fresh_admin(page):
    page.goto(URL + "/")
    page.evaluate("localStorage.clear()")
    page.goto(URL + "/")
    page.get_by_role("button", name="Prototype tools").click()
    page.get_by_role("button", name="Administrator ·").click()
    page.keyboard.press("Escape")


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"]) if CHROME else p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        def guest_redirect():
            page.goto(URL + "/")
            page.evaluate("localStorage.clear()")
            page.goto(URL + "/admin/queue")
            expect(page).to_have_url(re.compile(r"/login\?next="))
        check("Guests opening /admin are sent to Log in", guest_redirect)

        def shopper_denied():
            page.get_by_role("button", name="Prototype tools").click()
            page.get_by_role("button", name="Shopper ·").click()
            page.keyboard.press("Escape")
            page.goto(URL + "/admin")
            expect(page.get_by_text("You do not have access to this page")).to_be_visible()
        check("A shopper sees Access denied on /admin", shopper_denied)

        def dashboard():
            fresh_admin(page)
            page.goto(URL + "/admin")
            expect(page.get_by_text("Submissions waiting")).to_be_visible()
            expect(page.get_by_text("Needs a decision")).to_be_visible()
        check("FR17 dashboard lists items that need a decision", dashboard)

        def approve_new():
            fresh_admin(page)
            page.goto(URL + "/admin/queue/a-1047")
            page.get_by_role("button", name="Approve").click()
            page.get_by_role("dialog").get_by_role("button", name="Approve").click()
            expect(page.get_by_text("Approved by")).to_be_visible()
            page.goto(URL + "/explore?q=henna")
            expect(page.get_by_role("link", name="Henna House")).to_be_visible()
        check("FR17 approving a new store makes it public", approve_new)

        def competing_claim():
            fresh_admin(page)
            page.goto(URL + "/admin/queue/a-1044")
            expect(page.get_by_role("status").filter(has_text="Competing claim")).to_be_visible()
            page.get_by_role("button", name="Approve").click()
            page.get_by_role("dialog").get_by_role("button", name="Approve").click()
            expect(page.get_by_text("Approved by")).to_be_visible()
            page.goto(URL + "/admin/queue/a-1045")
            expect(page.get_by_text("Another owner proved ownership")).to_be_visible()
        check("FR17 approving one claim rejects the competing claim", competing_claim)

        def request_changes_validation():
            fresh_admin(page)
            page.goto(URL + "/admin/queue/a-1042")
            page.get_by_role("button", name="Request changes").click()
            page.get_by_role("button", name="Send to owner").click()
            expect(page.get_by_text("Describe the change, or remove this item.")).to_be_visible()
            page.get_by_label("Change 1").fill("Upload your commercial registration document.")
            page.get_by_role("button", name="Send to owner").click()
            expect(page.get_by_role("heading", name="Changes requested", exact=True)).to_be_visible()
        check("FR17 request changes validates and saves", request_changes_validation)

        def reject_short_reason():
            fresh_admin(page)
            page.goto(URL + "/admin/queue/a-1042")
            page.get_by_role("button", name="Reject").click()
            page.locator("#reject-reason").fill("No.")
            page.get_by_role("button", name="Reject submission").click()
            expect(page.get_by_text("Write at least 20 characters")).to_be_visible()
        check("FR17 reject needs a reason of 20+ characters", reject_short_reason)

        def create_store():
            fresh_admin(page)
            page.goto(URL + "/admin/catalog/new")
            page.get_by_role("button", name="Add store").last.click()
            expect(page.get_by_text("Please fix the highlighted fields")).to_be_visible()
            page.get_by_label("Store name").fill("Test Lantern Co")
            page.get_by_label("Official website").fill("https://urbannest.sa")
            page.get_by_label("Category").select_option("home")
            page.get_by_label("Description").fill("Handmade lanterns and outdoor lights.")
            page.get_by_role("button", name="Add store").last.click()
            expect(page.get_by_text("Urban Nest already uses urbannest.sa.")).to_be_visible()
            page.get_by_label("Official website").fill("https://lanterns-test.sa")
            page.get_by_role("button", name="Add store").last.click()
            expect(page).to_have_url(re.compile(r"/admin/catalog$"))
            page.goto(URL + "/explore?q=lantern")
            expect(page.get_by_role("link", name="Test Lantern Co")).to_be_visible()
        check("FR18 add store validates duplicates and goes live", create_store)

        def edit_store():
            fresh_admin(page)
            page.goto(URL + "/admin/catalog/urban-nest")
            page.get_by_label("Description").fill("Curated home decor, lamps and modular furniture for city living.")
            page.get_by_role("button", name="Save changes").click()
            expect(page).to_have_url(re.compile(r"/admin/catalog$"))
            page.goto(URL + "/stores/urban-nest")
            expect(page.get_by_text("lamps and modular furniture for city living").first).to_be_visible()
        check("FR19 edit store shows on the public page", edit_store)

        def disable_restore_delete():
            fresh_admin(page)
            page.goto(URL + "/admin/catalog")
            row = page.locator("article", has_text="Voltix Audio")
            row.get_by_role("button", name="Disable").click()
            page.get_by_role("button", name="Disable store").click()
            expect(row.get_by_text("Disabled")).to_be_visible()
            page.goto(URL + "/explore?q=voltix")
            expect(page.get_by_role("link", name="Voltix Audio")).to_have_count(0)
            page.goto(URL + "/admin/catalog")
            row.get_by_role("button", name="Restore").click()
            page.get_by_role("button", name="Restore store").click()
            expect(row.get_by_text("Live")).to_be_visible()
            page.get_by_role("button", name="Delete Voltix Audio").click()
            confirm = page.get_by_role("button", name="Delete permanently")
            expect(confirm).to_be_disabled()
            page.get_by_label(re.compile("Type the store name")).fill("Voltix Audio")
            confirm.click()
            expect(page.locator("article", has_text="Voltix Audio")).to_have_count(0)
        check("FR20 disable, restore and delete a store", disable_restore_delete)

        def categories():
            fresh_admin(page)
            page.goto(URL + "/admin/categories")
            page.get_by_role("button", name="Add category").first.click()
            page.get_by_label("Name").fill("electronics")
            page.get_by_role("dialog").get_by_role("button", name="Add category").click()
            expect(page.get_by_text("A category with this name already exists.")).to_be_visible()
            page.get_by_label("Name").fill("Pets")
            page.get_by_role("button", name="Icon PawPrint").click()
            page.get_by_role("dialog").get_by_role("button", name="Add category").click()
            expect(page.get_by_text("Pets", exact=True)).to_be_visible()
            page.get_by_role("button", name="Move Pets up").click()
            page.get_by_role("button", name="Delete Electronics").click()
            page.get_by_role("button", name="Delete category").click()
            expect(page.get_by_text("Choose where these stores should go.")).to_be_visible()
        check("FR21 categories: duplicate name, add, reorder, delete needs a target", categories)

        def moderation():
            fresh_admin(page)
            page.goto(URL + "/stores/bluesky")
            before = page.locator("main").inner_text()
            page.goto(URL + "/admin/moderation")
            card = page.locator("article", has_text="Promo Bot")
            card.get_by_role("button", name="Hide").click()
            expect(page.get_by_text(re.compile("rating goes from"))).to_be_visible()
            page.get_by_role("button", name="Hide review").click()
            expect(page.locator("article", has_text="Promo Bot")).to_have_count(0)
            page.goto(URL + "/stores/bluesky")
            expect(page.get_by_text("BEST PRICES")).to_have_count(0)
            assert "Promo Bot" not in page.locator("main").inner_text() or "Promo Bot" not in before
        check("FR22 hiding a reported review removes it from the store page", moderation)

        def keep_review():
            fresh_admin(page)
            page.goto(URL + "/admin/moderation")
            page.locator("article", has_text="Mona Q.").get_by_role("button", name="Keep").click()
            expect(page.locator("article", has_text="Mona Q.")).to_have_count(0)
        check("FR22 keeping a review dismisses its reports", keep_review)

        def featured():
            fresh_admin(page)
            page.goto(URL + "/admin/featured")
            page.get_by_role("button", name="Schedule").last.click()
            expect(page.get_by_text("Choose a store.")).to_be_visible()
            page.get_by_label("Store").select_option("saffron")
            page.get_by_role("button", name="Schedule").last.click()
            expect(page.get_by_text("Slot scheduled")).to_be_visible()
            page.goto(URL + "/")
            expect(page.get_by_text("Saffron & Sage").first).to_be_visible()
        check("FR23 schedule a featured store for Home", featured)

        def featured_coupon_expiry():
            fresh_admin(page)
            page.goto(URL + "/admin/featured")
            page.get_by_role("button", name="Coupon", exact=True).click()
            page.get_by_label("Store").select_option("urban-nest")
            page.get_by_label("Coupon").select_option("c3")
            page.get_by_label("Last day").fill("2099-01-01")
            page.get_by_role("button", name="Schedule").last.click()
            expect(page.get_by_text(re.compile("A slot can run for 60 days at most|expires on"))).to_be_visible()
        check("FR23 coupon slot cannot outlast the rules", featured_coupon_expiry)

        def analytics():
            fresh_admin(page)
            page.goto(URL + "/admin/analytics")
            expect(page.get_by_text("Referral visits per day")).to_be_visible()
            page.get_by_role("button", name="Custom").click()
            page.get_by_label("From").fill("2099-01-10")
            expect(page.get_by_text("The start date must be before the end date.")).to_be_visible()
            page.get_by_role("button", name="7 days").click()
            page.get_by_label("Category").select_option("electronics")
            with page.expect_download() as d:
                page.get_by_role("button", name="Export CSV").click()
            text = open(d.value.path(), encoding="utf-8-sig").read()
            assert text.startswith("Store,Category"), text[:40]
            assert "CloudNexus Hosting" in text and "Velvet & Vine" not in text
        check("FR24 analytics validates dates and exports filtered CSV", analytics)

        def support_reply():
            fresh_admin(page)
            page.goto(URL + "/admin/support/t-2202")
            page.get_by_label("Your reply").fill("Thanks Layla, please upload your registration in the claim.")
            page.get_by_role("button", name="Send reply").click()
            expect(page.get_by_text("Thanks Layla, please upload")).to_be_visible()
            expect(page.get_by_role("status").filter(has_text="Reply sent")).to_be_visible()
        check("FR16 admin replies to a support request", support_reply)

        def guide():
            page.goto(URL + "/guide")
            expect(page.get_by_text("26 of 26 requirements")).to_be_visible()
            page.get_by_label("Search requirements").fill("FR22")
            expect(page.get_by_text("1 of 26 requirements")).to_be_visible()
        check("Guide lists and filters every requirement", guide)

        def mobile_no_overflow():
            fresh_admin(page)
            page.set_viewport_size({"width": 375, "height": 800})
            for path in ["/admin", "/admin/queue", "/admin/catalog", "/admin/categories", "/admin/moderation", "/admin/featured", "/admin/analytics", "/admin/support", "/guide"]:
                page.goto(URL + path)
                page.wait_for_timeout(600)
                width = page.evaluate("document.documentElement.scrollWidth")
                assert width <= 375, f"{path} is {width}px wide"
            page.set_viewport_size({"width": 1280, "height": 900})
        check("All admin pages fit a 375px phone screen", mobile_no_overflow)

        check("No JavaScript errors", lambda: (_ for _ in ()).throw(AssertionError(errors[0])) if errors else None)
        browser.close()

    passed = sum(1 for r in results if r[1])
    print(f"\n{passed}/{len(results)} checks passed")
    return passed == len(results)


if __name__ == "__main__":
    raise SystemExit(0 if run() else 1)
