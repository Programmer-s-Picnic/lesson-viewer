"""Create a seven-day SELF-SIGNED development certificate for localhost and a LAN IP.
Usage: py generate_cert.py 192.168.1.5
Requires: py -m pip install cryptography
Never publish key.pem or use this certificate for a production website.
"""
import ipaddress
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: py generate_cert.py YOUR_LAPTOP_WIFI_IPV4 (find it with ipconfig)")
    try:
        lan_ip = ipaddress.ip_address(sys.argv[1])
    except ValueError:
        raise SystemExit("Please provide a numeric IP address, e.g. 192.168.1.5")
    if lan_ip.version != 4:
        raise SystemExit("For this lab, use the laptop's IPv4 address shown by ipconfig.")

    root = Path(__file__).resolve().parent
    if (root / "key.pem").exists() or (root / "cert.pem").exists():
        raise SystemExit("key.pem or cert.pem already exists. Move/delete both before generating a replacement.")

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    now = datetime.now(timezone.utc)
    san = x509.SubjectAlternativeName([
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        x509.IPAddress(lan_ip),
    ])
    certificate = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=7))
        .add_extension(san, critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    (root / "key.pem").write_bytes(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ))
    (root / "cert.pem").write_bytes(certificate.public_bytes(serialization.Encoding.PEM))
    print("Generated cert.pem and key.pem (SELF-SIGNED, UNTRUSTED, development only).")
    print("Certificate names: localhost, 127.0.0.1, " + str(lan_ip))
    print("Keep key.pem PRIVATE. Never commit or upload it.")


if __name__ == "__main__":
    main()
