# HTTPS server lab — AWS Day 1

This is a **classroom-only** HTTPS demo. It is not production hosting and should not be exposed to the Internet.

## Requirements
- Windows laptop with Python installed and connected to the same Wi-Fi as the phone.
- Python package `cryptography`: `py -m pip install cryptography`.

## Procedure
1. Create an HTML file named `index.html` in this folder.
2. Run `ipconfig` and copy the **IPv4 Address** under the active Wi-Fi adapter (not **Default Gateway**, which is usually the router).
3. From this folder, run `py generate_cert.py 192.168.1.5` using your own IPv4 address.
4. Run `py https_server.py` and leave the Command Prompt window open.
5. On the laptop, open `https://localhost:8443/`. The self-signed certificate generates a browser trust warning.
6. On a phone connected to the same trusted Wi-Fi, try `https://192.168.1.5:8443/`, replacing the example with the laptop's IP. The phone will likewise not trust the certificate automatically.
7. For a trustworthy **programmatic** local test without disabling verification, from the same folder use:
   `py -c "import ssl,urllib.request; c=ssl.create_default_context(cafile='cert.pem'); print(urllib.request.urlopen('https://localhost:8443/',context=c).status)"`
8. In Chrome DevTools (F12) → Network, compare the request scheme `https://` with the earlier `http://` request, and inspect Security to explain why the certificate is untrusted.
9. Stop the HTTPS server with Ctrl+C. Remove any temporary Windows Firewall exception.

**Important:** A self-signed certificate can encrypt the connection but is not automatically trusted by Chrome or Android. Do not disable certificate checking globally, do not install unknown root CA certificates, and never bypass browser certificate warnings on unrelated websites.

On a controlled classroom laptop, the instructor may choose to proceed past a warning **only** for this self-generated local test certificate, if the browser permits. For a real website, obtain a certificate from a trusted CA for a domain. Keep `key.pem` secret: it contains the private key. If your Wi-Fi IP changes, safely regenerate both local certificate/key files for the new address.

Source scripts:
- [generate_cert.py](./generate_cert.py)
- [https_server.py](./https_server.py)
