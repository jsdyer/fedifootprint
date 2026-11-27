"""Collect only the public weekly FediDB data files linked from its publisher index."""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
import gzip
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from tempfile import NamedTemporaryFile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INDEX = "https://fedidb.com/datasets"
FILE = re.compile(r"https://fedidbcdn\.com/datasets/(countries|servers)/(\d{4}-\d{2}-\d{2})-[a-f0-9]+/\1-\2\.json\.gz")


class Index(HTMLParser):
    def __init__(self):
        super().__init__()
        self.editions = defaultdict(dict)

    def handle_starttag(self, tag, attrs):
        url = dict(attrs).get("href", "")
        m = FILE.fullmatch(url) if tag == "a" else None
        if m:
            kind, day = m.groups()
            date.fromisoformat(day)
            old = self.editions[day].get(kind)
            if old and url != old:
                raise ValueError("Ambiguous published edition")
            self.editions[day][kind] = url


def fetch(url):
    if url != INDEX and not FILE.fullmatch(url):
        raise ValueError("Expected an official FediDB dataset URL")
    request = Request(url, headers={"User-Agent":"CoolCode FediFootprint/1.0 (+https://coolcode.ca/fedifootprint/)"})
    with urlopen(request, timeout=50) as r:
        if urlsplit(r.geturl()).hostname != urlsplit(url).hostname:
            raise ValueError("Unexpected publisher redirect")
        data = r.read(12_000_001)
    if not data or len(data)>12_000_000:
        raise ValueError("Unexpected publisher response size")
    return data


def integer(n):
    if type(n) is not int or n < 0:
        raise ValueError("Invalid reported count")
    return n


def label(x):
    if not isinstance(x,str) or not x.strip() or len(x)>260 or any(ord(ch)<32 for ch in x):
        raise ValueError("Invalid publisher label")
    return x


def countries(rows):
    result,seen=[],set()
    for r in rows:
        country,software=label(r["country"]),label(r["software"])
        if (country,software) in seen:
            raise ValueError("Duplicate country/software observation")
        seen.add((country,software))
        servers=integer(r["servers"])
        if servers < 1:
            raise ValueError("Missing servers in published country row")
        result.append([country,software,servers,integer(r["users"]),integer(r["monthly_active"])])
    return sorted(result)


def domains(rows):
    # Domain cohorts have their own denominator and different inclusion rules.
    buckets=defaultdict(list)
    seen=set()
    for row in rows:
        host=label(row["domain"]).lower()
        if host in seen:
            raise ValueError("Duplicate server domain")
        seen.add(host)
        software=label(row["software"])
        country=label(row["country"]) if row["country"] is not None else None
        active=integer(row["monthly_active"]) if row["monthly_active"] is not None else None
        for group in [("all","all"),("software",software),("country",country)]:
            buckets[group].append((active,host))
    result={"all":{}, "country":{}, "software":{}}
    for (kind,key),group in buckets.items():
        reported=sorted([(n,h) for n,h in group if n is not None], key=lambda r:(-r[0],r[1]))
        item={"servers":len(group),"reporting":len(reported),"active":sum(n for n,h in reported),
              "top":[[h,n] for n,h in reported[:5] if n > 0]}
        if kind=="all":
            result["all"]=item
        elif key is None:
            result["unlocated"]=item
        else:
            result[kind][key]=item
    return result


def edition(item,get):
    day,links=item
    values,provenance={},{}
    for kind,parser in [("countries",countries),("servers",domains)]:
        raw=get(links[kind])
        data=gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
        records=json.loads(data)
        if not isinstance(records,list) or not records:
            raise ValueError("Empty or invalid "+kind+" export for "+day)
        values[kind]=parser(records)
        provenance[kind]={"url":links[kind],"sha256":sha256(data).hexdigest(),"rows":len(records)}
    return day,dict(date=day,sources=provenance,**values)


def update(path,get=fetch,checked=None):
    parser=Index()
    parser.feed(get(INDEX).decode())
    if not parser.editions or any(set(v) != {"servers","countries"} for v in parser.editions.values()):
        raise ValueError("Publisher index does not list matching weekly exports")
    previous=json.loads(path.read_text()) if path.exists() else {"editions":{}}
    existing=previous["editions"]
    if existing and max(parser.editions)<max(existing):
        raise ValueError("Publisher index precedes the last successful edition")
    # Fetch new or reissued, content-addressed files. Previously seen weeks remain available.
    needed=[(d,urls) for d,urls in sorted(parser.editions.items()) if d not in existing or
            any(existing[d]["sources"][k]["url"] != u for k,u in urls.items())]
    with ThreadPoolExecutor(max_workers=3) as pool:
        fresh=dict(pool.map(lambda item:edition(item,get),needed))
    dates={**existing,**fresh}
    result={"checked_at":checked or datetime.now(timezone.utc).date().isoformat(),"editions":dict(sorted(dates.items()))}
    path.parent.mkdir(parents=True,exist_ok=True)
    with NamedTemporaryFile("w",encoding="utf-8",dir=path.parent,delete=False) as f:
        json.dump(result,f,ensure_ascii=False,separators=(",",":"));f.write("\n")
    Path(f.name).replace(path)
    print(f"{len(dates)} published editions through {max(dates)}; fetched {len(fresh)}")


if __name__=="__main__":
    update(ROOT/"web/data/archive.json")
