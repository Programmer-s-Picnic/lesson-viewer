# Two-day classroom lab — three computers, one distributed website

Use these sample files with the password-protected Day 1 and Day 2 lessons at
https://programmer-s-picnic.github.io/lesson-viewer/aws/

## Example topology (replace these with the REAL Wi-Fi IPv4 addresses)

| Computer | Role | Example IP | Port | Files |
|---|---|---|---|---|
| 1 | Images | 192.168.1.10 | 8001 | images/logo.svg |
| 2 | Stylesheets | 192.168.1.11 | 8002 | css/style.css |
| 3 | HTML and browser | 192.168.1.12 | 8003 | site/index.html |

Each computer must use its own folder; the same port number can be reused on different computers, but we intentionally use 8001–8003 to make the demonstration clearer.

### Day 1 commands (Windows Command Prompt)
Computer 1, from the folder containing `images/`:
```cmd
py -m http.server 8001 --bind 0.0.0.0 --directory images
```
Computer 2, from the folder containing `css/`:
```cmd
py -m http.server 8002 --bind 0.0.0.0 --directory css
```
Computer 3, from the folder containing `site/`:
```cmd
py -m http.server 8003 --bind 0.0.0.0 --directory site
```
In Computer 3's browser, open `http://192.168.1.12:8003/`. Change the IPs in `site/index.html` to the actual addresses for computers 1 and 2.

Use Chrome F12 → Network → Disable cache → Reload; inspect three document/CSS/image requests and their distinct endpoints. Run `curl.exe -I` on each endpoint and check for HTTP 200.

### Day 2 commands (Windows hosts file)
On **Computer 3**, open Notepad as Administrator and edit `C:\Windows\System32\drivers\etc\hosts`. Add:
```text
192.168.1.10 images.home.arpa
192.168.1.11 css.home.arpa
192.168.1.12 site.home.arpa
```
Save; run `ipconfig /flushdns`. Open `http://site.home.arpa:8003/index-domains.html`.

Note: these hosts-file entries work only on the device where configured. A fourth device requires its own entries OR an appropriately configured shared DNS server. `nslookup` queries DNS and usually does NOT use the Windows hosts-file mapping; `curl.exe -I http://images.home.arpa:8001/logo.svg` is a better direct page-access check.

### HTTPS extension
For the HTTPS server on Computer 3, get `generate_cert.py` and `https_server.py` from `aws/https-demo/`. Place the Python scripts in the same folder as `site/`; keep the generated `key.pem` and `cert.pem` OUTSIDE the served `site/` folder. Open `https://localhost:8443/secure.html` (NOT `index.html`) to avoid mixed content from HTTP CSS/images. The self-signed certificate is expected to trigger a browser trust warning.

For a name such as `site.home.arpa`, you need BOTH name resolution and an HTTPS certificate whose Subject Alternative Name includes that hostname. `mkcert` can create a locally trusted certificate on the computer with its local development CA installed, but other devices won't trust it automatically.

Do not put credentials, private keys, certificate authority private keys or other secrets in any directory served by the Python server. Python http.server is for teaching/development, not production.
