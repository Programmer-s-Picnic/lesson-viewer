# AWS Cloud Computing — Learn With Champak

Course folder for **Programmer's Picnic / Learn With Champak**, in the lesson-viewer repository.

## Live URL
https://programmer-s-picnic.github.io/lesson-viewer/aws/

## Published content
- Week 1, 16–22 November 2026: five teaching sessions and two supervised practical labs, all on the landing page.
- Each day has a 90-minute plan, instructor narration, concepts, activity steps, review questions and homework.
- Day 1 begins with Python HTTP on localhost and Wi-Fi, inspects the request in Chrome DevTools Network, then generates a self-signed TLS certificate and runs a local HTTPS server on port 8443. Students compare HTTP/HTTPS and browser certificate trust. Day 3 repeats HTTP and Wi-Fi as a supervised lab with an optional HTTPS extension; Day 6 has a second checklist and Day 7 has an interactive mini-quiz.

## Page password guard
The HTML loads the existing public JavaScript password gate at
`https://programmer-s-picnic.github.io/json-images/pwd.js`.

The script hashes entered passwords and compares them to its embedded SHA-256 password hash. It remembers successful access for the current calendar date **per URL**. The course never stores the plain password.

**Security limitation:** This is browser-side access gating, not genuine content confidentiality. The repository and HTML source are publicly retrievable; determined users can read them or bypass the overlay. To keep the teaching content secret, serve it behind server-side authentication and authorization rather than public GitHub Pages.

## Adding future weeks
Create additional pages beneath `aws/week-2/` etc., including the same password script in each page's <head>. If you want password entry only once for an entire course, server-side authentication or a different access design is needed.

## Safety
Learners should avoid exposing AWS access keys, private IP configuration, or other credentials. AWS services introduced in later weeks may incur charges; teach billing alerts and IAM safety before any provisioning.

## Local HTTPS lab files
- `https-demo/generate_cert.py` — creates a seven-day self-signed certificate for localhost and the laptop's Wi-Fi IPv4 address using the Python `cryptography` package.
- `https-demo/https_server.py` — Python HTTPS server on port 8443 with an isolated `site/` document root.
- `https-demo/site/index.html` — sample webpage.
- `https-demo/README.md` — setup, Chrome Network instructions, certificate warnings and troubleshooting.

**Security:** Keep `key.pem` and `cert.pem` outside the served `site/` directory. `https-demo/.gitignore` excludes the generated local files. The certificate is not publicly trusted and should never be used in production.

## Detailed teaching scripts — updated 17 November 2026

The protected `aws/index.html` now contains **expanded, classroom-ready scripts**:
- **Day 1:** Python HTTP server on localhost and Wi-Fi; a distributed website with image server (Computer 1, port 8001), stylesheet server (Computer 2, port 8002), and HTML/browser (Computer 3, port 8003); Chrome Network inspection; errors/diagnostics; secure local HTTPS demo with an isolated `site/` folder, self-signed TLS certificate, optional mkcert, expected results, full test matrix and submission checklist.
- **Day 2:** Explain hostnames and `home.arpa`; map three server IPs in the Windows hosts file on the browsing computer; test mapped names using ping/curl; explain why nslookup may not reflect hosts entries; switch the same HTML/CSS/image requests to domain names; inspect Chrome Network; outline local DNS for other Wi-Fi devices; optional HTTPS SAN/trust; diagnostics, expected results, assignments and viva.
- **Day 3:** Supervised repeat of the three-server and domain-mapping practical, with success criteria.

Reusable student lab source files in [`aws/labs/three-computers/`](./labs/three-computers/):
- `images/logo.svg` for Computer 1
- `css/style.css` for Computer 2
- `site/index.html` (IPs) and `site/index-domains.html` (hostnames) for Computer 3
- `site/secure.html` for the TLS demonstration without mixed-content problems
- `test_endpoints.py` to check three resource URLs and status codes on Day 1 (`--mode ip`) or Day 2 (`--mode domains`).

**Example topology only:** Images at 192.168.1.10:8001, CSS at 192.168.1.11:8002, HTML at 192.168.1.12:8003. Each instructor/student must replace these with the three computers' real IPv4 addresses. A hosts file is local to the device on which it was edited; it is not a network-wide DNS service.

**Production-security caveat:** Python's `http.server` and our HTTPS sample are teaching tools only; do not make them Internet-facing. Keep private keys out of `site/`. The published `pwd.js` gate is client-side only and does not secure the public GitHub HTML source.
