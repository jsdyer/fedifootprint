import gzip
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import refresh

def fake_source(day="2026-10-18", country="Canada", partial=False):
    row={"software":"alpha","country":country,"servers":5,"users":9,"monthly_active":4}
    servers=[{"domain":"one.example","software":"alpha","country":country,"monthly_active":4},
             {"domain":"two.example","software":"alpha","country":None,"monthly_active":None}]
    links={kind:f"https://fedidbcdn.com/datasets/{kind}/{day}-cafeface/{kind}-{day}.json.gz" for kind in ("countries","servers")}
    docs={refresh.INDEX:"".join('<a href="'+url+'">link</a>' for k,url in links.items() if k!="servers" or not partial).encode()}
    docs[links["countries"]]=gzip.compress(json.dumps([row]).encode())
    docs[links["servers"]]=gzip.compress(json.dumps(servers).encode())
    return docs

class Refresh(unittest.TestCase):
    def test_null_activity_remains_missing_and_unknown_location_is_separate(self):
        output=refresh.domains([{"domain":"a.example","software":"b","country":None,"monthly_active":None},{"domain":"b.example","software":"b","country":"Canada","monthly_active":0}])
        self.assertEqual(output["all"],{"servers":2,"reporting":1,"active":0,"top":[]})
        self.assertEqual(output["unlocated"]["reporting"],0)
        self.assertEqual(output["country"]["Canada"]["reporting"],1)

    def test_retention_week_rollover_and_failure_no_write(self):
        with TemporaryDirectory() as temp:
            path=Path(temp)/"archive.json"
            refresh.update(path,fake_source().__getitem__,"2026-10-19")
            refresh.update(path,fake_source("2026-10-25","Germany").__getitem__,"2026-10-26")
            original=path.read_bytes()
            self.assertEqual(len(json.loads(original)["editions"]),2)
            for bad in (fake_source("2026-11-01",partial=True),{},fake_source()):
                with self.assertRaises((ValueError,KeyError)):
                    refresh.update(path,bad.__getitem__)
                self.assertEqual(path.read_bytes(),original)

    def test_rejects_duplicates_and_untrusted_publisher_urls(self):
        data={"country":"Canada","software":"a","servers":1,"users":8,"monthly_active":2}
        with self.assertRaises(ValueError):
            refresh.countries([data,data])
        with self.assertRaises(ValueError):
            refresh.countries([{**data,"servers":True}])
        p=refresh.Index();p.feed('<a href="https://other.example/datasets/servers/2026-10-18-abc/servers-2026-10-18.json.gz">no</a>')
        self.assertFalse(p.editions)
