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
