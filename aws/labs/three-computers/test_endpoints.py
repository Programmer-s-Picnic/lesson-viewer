"""Day 1 / Day 2 endpoint tests for our three-computer classroom.
Python standard library only; run from Computer 3 (or another client).
Examples:
  py test_endpoints.py --mode ip --images-ip 192.168.1.10 --css-ip 192.168.1.11 --site-ip 192.168.1.12
  py test_endpoints.py --mode domains
This checks HTTP connectivity and status codes; it does not modify files.
"""
import argparse
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description="Test the classroom's three HTTP servers")
    parser.add_argument("--mode", choices=("ip", "domains"), default="ip")
    parser.add_argument("--images-ip", default="192.168.1.10")
    parser.add_argument("--css-ip", default="192.168.1.11")
    parser.add_argument("--site-ip", default="192.168.1.12")
    args = parser.parse_args()

    if args.mode == "domains":
        hosts = ("images.home.arpa", "css.home.arpa", "site.home.arpa")
        site_path = "/index-domains.html"
    else:
        hosts = (args.images_ip, args.css_ip, args.site_ip)
        site_path = "/index.html"

    urls = (
        ("Image (Computer 1)", f"http://{hosts[0]}:8001/logo.svg"),
        ("CSS (Computer 2)", f"http://{hosts[1]}:8002/style.css"),
        ("HTML (Computer 3)", f"http://{hosts[2]}:8003{site_path}"),
    )

    failed = 0
    for label, url in urls:
        try:
            req = Request(url, method="HEAD")
            with urlopen(req, timeout=5) as response:
                status = response.status
                ok = status == 200
                print(f"{'PASS' if ok else 'FAIL'}  {label}: HTTP {status}  {url}")
                failed += not ok
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            print(f"FAIL  {label}: {error}  {url}")
            failed += 1
    print(f"Results: {len(urls) - failed}/{len(urls)} successful")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
