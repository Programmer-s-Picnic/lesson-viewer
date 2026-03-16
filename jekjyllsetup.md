COMPLETE INSTRUCTIONS: ADD ADSENSE TO ALL PAGES OF A GITHUB PAGES SITE USING JEKYLL

Your AdSense publisher ID:
ca-pub-8321261883090494

==================================================
STEP 1: CHECK THAT .nojekyll DOES NOT EXIST
==================================================

In your repo root, make sure this file is NOT present:

.nojekyll

If it exists, delete it.

Reason:
GitHub Pages will not process Jekyll layouts if .nojekyll is present.

==================================================
STEP 2: CREATE THIS FOLDER/FILE STRUCTURE
==================================================

repo/
│
├── _config.yml
├── ads.txt
├── index.html
├── about.md
│
└── _layouts/
    └── default.html

==================================================
STEP 3: CREATE _config.yml
==================================================

Create a file named:

_config.yml

Put this inside:

title: Programmer's Picnic
description: Tools and learning resources by Champak Roy

==================================================
STEP 4: CREATE _layouts/default.html
==================================================

Create a folder named:

_layouts

Inside it create a file named:

default.html

Put this full code inside _layouts/default.html:

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{ page.title | default: "Programmer's Picnic" }}</title>

  <!-- Google AdSense -->
  <script async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8321261883090494"
    crossorigin="anonymous"></script>

  <style>
    body{
      font-family: system-ui, Arial, sans-serif;
      background: #fff8ef;
      color: #222;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .page{
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px;
    }
    h1,h2,h3{
      margin-top: 0;
    }
    a{
      color: #b45309;
    }
  </style>
</head>
<body>
  <div class="page">
    {{ content }}
  </div>
</body>
</html>

IMPORTANT:
- The file name is default.html
- The folder name is _layouts
- Do NOT name the file _default.html

==================================================
STEP 5: UPDATE index.html
==================================================

Replace your current index.html with this:

---
layout: default
title: Programmer's Picnic
---

<h1>Programmer's Picnic</h1>
<p>Google AdSense is now loaded from the shared Jekyll layout.</p>
<p>This means every page using <strong>layout: default</strong> will automatically include AdSense.</p>

IMPORTANT:
- Do NOT keep the old full HTML document in index.html
- Once you use Jekyll layout, index.html should contain only:
  1. front matter
  2. page content

==================================================
STEP 6: CREATE A SECOND PAGE TO TEST ALL-PAGE LOADING
==================================================

Create a file named:

about.md

Put this inside:

---
layout: default
title: About
---

# About

This page also uses the shared Jekyll layout.

If this page loads correctly, AdSense is being included here too.

==================================================
STEP 7: CREATE ads.txt IN THE REPO ROOT
==================================================

Create a file named:

ads.txt

Put this exact line inside:

google.com, pub-8321261883090494, DIRECT, f08c47fec0942fa0

After deployment, this should open in the browser:

https://your-domain/ads.txt

For your subdomain, likely:

https://editor.learnwithchampak.live/ads.txt

==================================================
STEP 8: COMMIT AND PUSH
==================================================

Run:

git add .
git commit -m "Add Jekyll layout with AdSense"
git push

==================================================
STEP 9: WAIT FOR GITHUB PAGES TO REBUILD
==================================================

After pushing, wait for the site to redeploy.

Then open:

https://editor.learnwithchampak.live/
https://editor.learnwithchampak.live/about.html

==================================================
STEP 10: VERIFY THAT ADSENSE IS ON BOTH PAGES
==================================================

Method 1: View Page Source

Open page source on both pages and search for:

ca-pub-8321261883090494

You should find the AdSense script in both.

Method 2: Browser Console

Open browser console and run:

window.adsbygoogle

If the script loaded, you should see an object/array.

==================================================
STEP 11: WHAT MAKES ADSENSE LOAD ON ALL PAGES
==================================================

This line in each page:

layout: default

tells Jekyll to use:

_layouts/default.html

And this line in the layout:

{{ content }}

inserts the page body into that shared layout.

Because the AdSense script is in default.html, every page using that layout gets the script automatically.

==================================================
STEP 12: HOW TO ADD MORE PAGES LATER
==================================================

Any new page should start like this:

---
layout: default
title: Page Title
---

Page content here.

Example:

---
layout: default
title: Contact
---

# Contact

You can reach us here.

As long as layout: default is present, AdSense will be included automatically.

==================================================
STEP 13: COMMON MISTAKES TO AVOID
==================================================

1. Wrong file name
   Wrong: _layouts/_default.html
   Correct: _layouts/default.html

2. Wrong folder name
   Wrong: layouts
   Correct: _layouts

3. Keeping .nojekyll
   If .nojekyll exists, Jekyll layouts will not work

4. Leaving old full HTML in index.html
   Once layout is used, index.html should not have its own <html>, <head>, or <body> tags

5. Forgetting front matter
   Every page that should use the layout must begin with:

   ---
   layout: default
   title: Some Title
   ---

==================================================
FINAL WORKING FILES
==================================================

1) _config.yml

title: Programmer's Picnic
description: Tools and learning resources by Champak Roy

--------------------------------------------------

2) _layouts/default.html

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{ page.title | default: "Programmer's Picnic" }}</title>

  <script async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8321261883090494"
    crossorigin="anonymous"></script>

  <style>
    body{
      font-family: system-ui, Arial, sans-serif;
      background: #fff8ef;
      color: #222;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .page{
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px;
    }
  </style>
</head>
<body>
  <div class="page">
    {{ content }}
  </div>
</body>
</html>

--------------------------------------------------

3) index.html

---
layout: default
title: Programmer's Picnic
---

<h1>Programmer's Picnic</h1>
<p>Google AdSense is now loaded from the shared Jekyll layout.</p>

--------------------------------------------------

4) about.md

---
layout: default
title: About
---

# About

This page also uses the shared Jekyll layout.

--------------------------------------------------

5) ads.txt

google.com, pub-8321261883090494, DIRECT, f08c47fec0942fa0

==================================================
NEXT STEP AFTER THIS WORKS
==================================================

After this is working, the next improvement is:
- add header/footer
- add SEO meta tags
- add a reusable Programmer's Picnic theme
- optionally add manual ad slots inside content areas