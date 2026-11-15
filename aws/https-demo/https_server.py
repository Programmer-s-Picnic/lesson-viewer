"""Classroom-only HTTPS server.
The document root is ./site, so cert.pem and key.pem are NOT downloadable.
Usage: py https_server.py
"""
import ssl
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCUMENT_ROOT = ROOT / "site"
HOST = "0.0.0.0"  # LAN-accessible; only on a trusted private network
PORT = 8443

if not (ROOT / "cert.pem").is_file() or not (ROOT / "key.pem").is_file():
    raise SystemExit("First run: py generate_cert.py YOUR_LAPTOP_WIFI_IPV4")
if not DOCUMENT_ROOT.is_dir():
    raise SystemExit("Create the 'site' folder beside this script and place index.html inside it.")

handler = partial(SimpleHTTPRequestHandler, directory=str(DOCUMENT_ROOT))
server = ThreadingHTTPServer((HOST, PORT), handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.minimum_version = ssl.TLSVersion.TLSv1_2
context.load_cert_chain(certfile=str(ROOT / "cert.pem"), keyfile=str(ROOT / "key.pem"))
server.socket = context.wrap_socket(server.socket, server_side=True)

print("Serving files ONLY from:", DOCUMENT_ROOT)
print("Local HTTPS: https://localhost:8443/")
print("Wi-Fi HTTPS: https://YOUR_LAPTOP_WIFI_IPV4:8443/")
print("Self-signed certificate: browsers will warn that identity is NOT trusted.")
print("Press Ctrl+C to stop. Do not expose this server to the public Internet.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nStopping HTTPS demo...")
finally:
    server.server_close()
