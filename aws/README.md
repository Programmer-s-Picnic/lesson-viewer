# AWS Cloud Computing — Learn With Champak

Course folder for **Programmer's Picnic / Learn With Champak**, in the lesson-viewer repository.

## Live URL
https://programmer-s-picnic.github.io/lesson-viewer/aws/

## Published content
- Week 1, 16–22 November 2026: five teaching sessions and two supervised practical labs, all on the landing page.
- Each day has a 90-minute plan, instructor narration, concepts, activity steps, review questions and homework.
- Day 1 starts immediately with a Python HTTP server on localhost, then access from a phone over the same Wi-Fi using the laptop's IPv4 address, and Chrome DevTools Network inspection. Day 3 repeats this as a supervised lab; Days 3 and 6 have checklists; Day 7 has an interactive mini-quiz.

## Page password guard
The HTML loads the existing public JavaScript password gate at
`https://programmer-s-picnic.github.io/json-images/pwd.js`.

The script hashes entered passwords and compares them to its embedded SHA-256 password hash. It remembers successful access for the current calendar date **per URL**. The course never stores the plain password.

**Security limitation:** This is browser-side access gating, not genuine content confidentiality. The repository and HTML source are publicly retrievable; determined users can read them or bypass the overlay. To keep the teaching content secret, serve it behind server-side authentication and authorization rather than public GitHub Pages.

## Adding future weeks
Create additional pages beneath `aws/week-2/` etc., including the same password script in each page's <head>. If you want password entry only once for an entire course, server-side authentication or a different access design is needed.

## Safety
Learners should avoid exposing AWS access keys, private IP configuration, or other credentials. AWS services introduced in later weeks may incur charges; teach billing alerts and IAM safety before any provisioning.
