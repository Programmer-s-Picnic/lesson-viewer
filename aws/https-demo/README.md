# HTTPS server lab — AWS Day 1

A classroom-only HTTPS demonstration. **Not production hosting**; do not expose it to the Internet.

## Folder layout (important)

```text
aws-day1/
  generate_cert.py
  https_server.py
  cert.pem             # generated locally; never uploaded
  key.pem              # generated locally; NEVER uploaded or served
  site/
    index.html          # only this folder is served
```

Keeping `site/` separate prevents the private key from being downloaded via the demonstration server.

## Requirements and steps

1. Download `generate_cert.py` and `https_server.py` into `aws-day1/`. Create `aws-day1/site/index.html`.
2. In Command Prompt: `cd aws-day1`; run `py -m pip install cryptography`.
3. Run `ipconfig`. Find the laptop's **Wi-Fi IPv4 Address**, not Default Gateway.
4. Run `py generate_cert.py 192.168.1.5` (replace the example IP with your actual address).
5. Optionally run HTTP on the same site in one terminal:
   `py -m http.server 8000 --bind 0.0.0.0 --directory site`
6. Run `py https_server.py` in a second terminal.
7. Open `https://localhost:8443/` on the laptop. The certificate is self-signed; Chrome will show an untrusted-certificate warning.
8. On a phone connected to the same trusted Wi-Fi, try `https://192.168.1.5:8443/`, substituting the laptop IP. Certificate warnings are expected.
9. In desktop Chrome, compare HTTP `http://localhost:8000/` with HTTPS `https://localhost:8443/` under F12 → Network and Security.
10. Optionally verify the exact certificate in Python without disabling verification:
    `py -c "import ssl,urllib.request; c=ssl.create_default_context(cafile='cert.pem'); print(urllib.request.urlopen('https://localhost:8443/',context=c).status)"`
11. Stop both servers with Ctrl+C and remove temporary firewall exceptions.

The self-signed certificate enables TLS encryption but is **not automatically trusted by browsers**. Do not disable certificate validation globally, install unknown root CA certificates, or bypass warnings on unrelated sites. For production HTTPS use an appropriate trusted certificate and a production web server.

The scripts use **Python's standard library** for serving HTTPS, with `cryptography` solely for generating a test certificate. If the laptop's Wi-Fi IP changes, regenerate the local key/certificate pair with the new IP; never share `key.pem`.
