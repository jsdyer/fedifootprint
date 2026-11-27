"""Exercise the production output at its project subpath on a phone and without JavaScript."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import os
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

def main():
    with TemporaryDirectory() as t:
        shutil.copytree(ROOT/"dist",Path(t)/"fedifootprint")
        server=ThreadingHTTPServer(("127.0.0.1",0),partial(Quiet,directory=t))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_BIN"))
                base=f"http://127.0.0.1:{server.server_port}/fedifootprint/"
                phone=browser.new_page(viewport={"width":390,"height":844})
                errors=[];phone.on("pageerror",lambda e:errors.append(str(e)))
                phone.goto(base);phone.locator(".bar").first.wait_for()
                assert phone.locator("#country").input_value()=="Canada"
                assert phone.locator("#country").bounding_box()["y"]<844
                assert phone.locator(".card").count()==2
                assert phone.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                screenshots=ROOT/"browser-checks";screenshots.mkdir(exist_ok=True)
                phone.screenshot(path=str(screenshots/"mobile.png"))
                phone.select_option("#other","Canada")
                assert phone.locator(".card").count()==1
                phone.select_option("#country","France")
                assert "country=France" in phone.url
                phone.reload();phone.locator(".bar").first.wait_for()
                assert phone.locator("#country").input_value()=="France"
                phone.select_option("#week",index=1)
                phone.locator("#result a",has_text="See this weekly export").click()
                assert "Fediverse hosting on" in phone.locator("h1").inner_text()
                assert "separate exports" in phone.locator("body").inner_text()
                phone.get_by_role("link",name="All records").click()
                phone.get_by_role("link",name="Mastodon",exact=True).last.click()
                assert "Mastodon" in phone.locator("h1").inner_text()
                plain=browser.new_page(java_script_enabled=False)
                plain.goto(base)
                plain.get_by_role("link",name="Read the country record").first.click()
                assert "Canada" in plain.locator("h1").inner_text()
                assert "Largest reporting domains" in plain.locator("body").inner_text()
                assert not errors,errors
                browser.close()
        finally:
            server.shutdown()
    print("Browser checks passed")
if __name__=="__main__":main()
