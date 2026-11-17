#!/usr/bin/env python3
"""Generate public HOMLY sitemap and optional Google Merchant Center RSS feed.
Reads only published product records through the public Supabase REST API.
Never uses a service role key, merchant credentials, or buyer information.
"""
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://anastasia2627.github.io/homly/"
PUBLIC_PAGES = ["", "catalog.html", "about.html", "contacts.html", "cookies.html"]
G = "http://base.google.com/ns/1.0"
ET.register_namespace("g", G)


def text(parent, name, value):
    ET.SubElement(parent, name).text = str(value)


def products_from_supabase():
    config = (ROOT / "store-config.js").read_text(encoding="utf-8")
    endpoint = re.search(r"supabaseUrl:\s*['\"]([^'\"]+)['\"]", config)
    public_key = re.search(r"publishableKey:\s*['\"]([^'\"]+)['\"]", config)
    if not endpoint or not public_key:
        raise RuntimeError("HOMLY public Supabase config is missing")
    url = endpoint.group(1).rstrip("/") + (
        "/rest/v1/homly_products?select=slug,title,description,"
        "price_kopeks,stock,image_urls,updated_at,published"
        "&published=eq.true&order=created_at.desc&limit=1000"
    )
    request = Request(url, headers={
        "apikey": public_key.group(1),
        "accept": "application/json",
        "user-agent": "HOMLY-public-feed-generator/1.0"
    })
    with urlopen(request, timeout=20) as response:
        rows = json.loads(response.read().decode("utf-8"))
    if not isinstance(rows, list):
        raise RuntimeError("Unexpected public product response")
    return [p for p in rows if p.get("published") is True]


def xml_write(path, root):
    ET.indent(root, space="  ")
    payload = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    Path(path).write_bytes(payload)


def sitemap(products):
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    urls = ET.Element(f"{{{namespace}}}urlset")
    for path in PUBLIC_PAGES:
        entry = ET.SubElement(urls, f"{{{namespace}}}url")
        text(entry, f"{{{namespace}}}loc", BASE + path)
    for p in products:
        slug = str(p.get("slug", ""))
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,70}", slug):
            continue
        entry = ET.SubElement(urls, f"{{{namespace}}}url")
        text(entry, f"{{{namespace}}}loc", BASE + "product.html?id=" + quote(slug))
        modified = str(p.get("updated_at") or "")[:10]
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", modified):
            text(entry, f"{{{namespace}}}lastmod", modified)
    xml_write(ROOT / "sitemap.xml", urls)


def photo_url(p):
    images = p.get("image_urls") or []
    for url in images:
        if not isinstance(url, str):
            continue
        parsed = urlparse(url)
        if (parsed.scheme == "https" and
            parsed.hostname == "rdwcymfjktxbyoidyhax.supabase.co" and
            parsed.path.startswith("/storage/v1/object/public/homly-products/")):
            return url
    return ""


def merchant_feed(products):
    rss = ET.Element("rss", {"version": "2.0"})
    channel = ET.SubElement(rss, "channel")
    text(channel, "title", "HOMLY — творчі DIY-набори")
    text(channel, "link", BASE)
    text(channel, "description", "Набори для творчості HOMLY в Україні")
    count = 0
    for p in products:
        slug = str(p.get("slug", ""))
        photo = photo_url(p)
        price = p.get("price_kopeks")
        if (not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,70}", slug)
            or not isinstance(price, int) or price < 100
            or not photo or not str(p.get("title") or "").strip()):
            continue
        item = ET.SubElement(channel, "item")
        text(item, f"{{{G}}}id", slug)
        text(item, f"{{{G}}}title", p["title"][:150])
        text(item, f"{{{G}}}description",
             (p.get("description") or p["title"])[:3000])
        text(item, f"{{{G}}}link", BASE + "product.html?id=" + quote(slug))
        text(item, f"{{{G}}}image_link", photo)
        text(item, f"{{{G}}}price", f"{price/100:.2f} UAH")
        text(item, f"{{{G}}}availability",
             "in_stock" if int(p.get("stock") or 0) > 0 else "out_of_stock")
        text(item, f"{{{G}}}condition", "new")
        text(item, f"{{{G}}}brand", "HOMLY")
        # Original HOMLY craft kits have no manufacturer-issued GTIN.
        text(item, f"{{{G}}}identifier_exists", "no")
        count += 1
    output = ROOT / "merchant-feed.xml"
    if count:
        xml_write(output, rss)
    elif output.exists():
        output.unlink()
    return count


def main():
    rows = products_from_supabase()
    sitemap(rows)
    count = merchant_feed(rows)
    print(f"HOMLY: {len(rows)} published items, {count} eligible merchant-feed items")


if __name__ == "__main__":
    main()
