"""Serve the current directory over HTTPS for a local classroom demonstration.
Requires cert.pem and key.pem from generate_cert.py.
Usage: py https_server.py
"""
import ssl
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "0.0.0.0"  # LAN-accessible; use only on trusted networks
PORT = 8443

if not Path("cert.pem").is_file() or not Path("key.pem").is_file():
    raise SystemExit("First run: py generate_cert.py YOUR_LAPTOP_WIFI_IPV4")

server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.minimum_version = ssl.TLSVersion.TLSv1_2
context.load_cert_chain(certfile="cert.pem", keyfile="key.pem")
server.socket = context.wrap_socket(server.socket, server_side=True)

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
