# 2048

A responsive 2048 clone built with vanilla HTML, CSS, and JavaScript.

## Local development

Open `index.html` in your browser or serve the directory using any static file server (for example `python -m http.server`).

## Progressive Web App support

The game registers a service worker and web app manifest so it can be installed to your device and played offline. When the browser makes the install prompt available, an **Install App** button appears in the UI. If you dismiss the offer, the app waits a few days before offering it again so you are not repeatedly interrupted.

## Deployment

Push to the `main` branch to trigger the GitHub Actions workflow in `.github/workflows/deploy.yml`, which publishes the site to GitHub Pages.
