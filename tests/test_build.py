from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import unittest
from urllib.parse import urljoin,urlsplit
from xml.etree import ElementTree as ET
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from build import build,ROOT

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links=[];self.canonical=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="link" and a.get("rel")=="canonical":self.canonical.append(a["href"])
        if tag=="a":self.links.append(a["href"])

class Build(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        build()
        cls.dist=ROOT/"dist"
    def test_every_link_and_canonical_in_native_sitemap(self):
        urls=[a.text for a in ET.parse(self.dist/"sitemap.xml").findall(".//{*}loc")]
        html=list((self.dist/"records").rglob("index.html"))
        self.assertEqual(len(html),len(set(urls)))
        self.assertEqual(len(html),len(urls))
        for file in html:
            p=Page();p.feed(file.read_text())
            expected="https://coolcode.ca/fedifootprint/"+file.relative_to(self.dist).as_posix().removesuffix("index.html")
            self.assertEqual(p.canonical,[expected])
            self.assertIn(expected,urls)
            for href in p.links:
                absolute=urljoin(expected,href)
                if absolute.startswith("https://coolcode.ca/fedifootprint/records/"):
                    self.assertIn(absolute,urls)
    def test_status_tracks_real_measures_and_first_use_works_without_scripts(self):
        s=json.loads((self.dist/"data/status.json").read_text())
        archive=json.loads((self.dist/"data/archive.json").read_text())["editions"]
        newest=archive[s["latest"]]
        self.assertEqual(s["represented_servers"],sum(r[2] for r in newest["countries"]))
        self.assertEqual(s["server_directory_rows"],newest["servers"]["all"]["servers"])
        self.assertEqual(s["editions"],len(archive))
        home=(self.dist/"index.html").read_text()
        self.assertIn('value="Canada" selected',home)
        self.assertIn("Read the country record",home)
        self.assertNotIn("<!--example-->",home)
        self.assertIn("CC BY 4.0",home)
