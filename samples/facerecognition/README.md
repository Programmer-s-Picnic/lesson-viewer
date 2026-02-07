# Face Recognition (Static, GitHub Pages)

## Files
- `capture.html` : capture multiple face crops per person (downloads JPGs + exports `faces.json`)
- `recognize.html` : face recognition using `data/faces.json` + images in `images/faces/`
- `data/faces.json` : mapping of names to multiple image paths
- `images/faces/` : put your captured face images here

## GitHub Pages workflow
1. Deploy this folder on GitHub Pages (HTTPS required for camera).
2. Open `capture.html`:
   - Enter a name, wait for red box, click **Save Face** 3–5 times per person.
   - Images will download. Upload them to `images/faces/` in the repo.
   - Click **Export faces.json**. Upload it to `data/faces.json` in the repo.
3. Open `recognize.html` and click START.

## Notes
- If recognition is weak, add more images per person with varied angles/lighting.
- If models fail to load, check internet/CDN access.
