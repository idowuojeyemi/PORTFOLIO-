# Idowu Ojeyemi — Portfolio

Creative Producer · Video Editor · Motion Designer · AI Filmmaker.

A bold, playful single-page portfolio with a film-production theme, built with plain HTML, CSS and JavaScript. It needs no build step.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Add your own media

Each project card has a taped "film still" with a play-button placeholder. Put an image or a short muted clip in `assets/work/`, then add it as the first child of that project's `.screen` in `index.html`:

```html
<div class="screen">
  <img src="assets/work/glo-pitch.jpg" alt="Glo pitch video still">
  ...
</div>
```

You can also use `<video src="assets/work/glo.mp4" autoplay muted loop playsinline></video>`. When a still has media, the play button hides automatically. To link a project to a full video, wrap the card's `<h3>` in an `<a href="...">`.

## Change the colours

The palette lives at the top of `styles.css` (`--blue`, `--mustard`, `--orange`, `--green` and `--lilac`). Each project card takes its colour from the `--c` value on its `<article>`. The site also has a dark mode, which visitors can switch on with the sun/moon button.

## Publish with GitHub Pages

In the repository, go to **Settings → Pages**. Set the source to **Deploy from a branch**, then choose `main` and `/ (root)`.
