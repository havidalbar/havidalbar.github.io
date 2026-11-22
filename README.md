# havidalbar.github.io

Personal site of **Mochamad Havid Albar Purnomo**, Software Engineer (backend) at Bank Mandiri, previously at Samsung Research Indonesia.

**Live:** https://havidalbar.github.io

## What's here

| Path | Description |
|---|---|
| [`/`](https://havidalbar.github.io/) | Portfolio: experience, skills, featured work, research and project archive |
| [`/haqiba/`](https://havidalbar.github.io/haqiba/) | Haqiba, an online store for personal shoppers trading between Indonesia and Saudi Arabia |
| [`/vocabkids/`](https://havidalbar.github.io/vocabkids/) | VocabKids AI, an English vocabulary app for kids (React build) |

## Portfolio

A single static page with no build step.

- HTML, CSS and vanilla JavaScript
- [Motion](https://motion.dev) for scroll-linked and pointer-driven animation
- Hand-made SVG project covers in `images/covers/`; the page inlines them so their light and depth follow the pointer
- Respects `prefers-reduced-motion` and stays fully readable without JavaScript
- Responsive from 375 px phones to wide desktops

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Serve the folder over HTTP rather than opening `index.html` directly, so the inline SVG covers and the sub-sites load correctly.

## Structure

```
index.html          portfolio page (markup, styles and scripts)
images/covers/      SVG project covers
images/projects/    screenshots of the live products
favicons/           site icons and web manifest
haqiba/             Haqiba landing page
vocabkids/          VocabKids production build
```

## Contact

- Email: havidalbar@gmail.com
- LinkedIn: [linkedin.com/in/havidalbar](https://www.linkedin.com/in/havidalbar/)
- GitHub: [@havidalbar](https://github.com/havidalbar)
