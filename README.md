# NachoFesta — 3D Company Presentation Website

> *"Made to crunch, Made to share"*

A five-page 3D presentation website for **NachoFesta**, a nacho company.
Built for the *Trade Exhibition Project* (English for Communication).

**Live site:** https://chakhrit5433-debug.github.io/nacho-festa/

---

## Pages

| Page | File | What's on it |
|---|---|---|
| Home | `index.html` | Three.js hero with floating 3D tortilla chips, brand intro, and a short explainer on what nachos are and where they came from |
| About Us | `about-us.html` | Executive org chart — CEO plus seven managers, each on a 3D tilt card |
| About Company | `about-company.html` | The founder's origin story told as a four-chapter timeline, plus mission / vision / values |
| Product | `product.html` | Three flavours with prices and a comparison table |
| Contact | `contact.html` | Rotating 3D moon with the HQ beacon, contact details, and a message form |

## Menu

| Flavour | Heat | Price |
|---|---|---|
| Original | Non-spicy | ฿69 |
| Cheese | Gentle | ฿79 |
| Spicy | Fiery | ฿79 |

## The 3D

Two Three.js scenes, both built entirely from code — no model or texture files are downloaded:

- **`js/scene-nachos.js`** — tortilla chips are rounded-corner triangles built with `ExtrudeGeometry`; the corn surface is a texture painted into a `<canvas>` at runtime. Chips drift on sine waves and the camera follows the pointer.
- **`js/scene-moon.js`** — the lunar surface (maria, craters, dust speckle) is painted into a `<canvas>` and used as both colour and bump map. An amber dome marks the headquarters.

Both scenes stop rendering when scrolled off-screen, fall back gracefully when WebGL is unavailable, and are skipped entirely under `prefers-reduced-motion`.

## Running it

No build step and no dependencies to install. Either:

```bash
# just open the file
start index.html

# or serve it, if you prefer
python -m http.server 8080
```

Three.js loads from a CDN, so the page needs an internet connection for the 3D scenes to appear.

## Structure

```
├── index.html · about-us.html · about-company.html · product.html · contact.html
├── css/style.css          design system + every component
├── js/
│   ├── main.js            nav, scroll reveal, 3D card tilt, contact form
│   ├── scene-nachos.js    floating chips (Home, Product)
│   └── scene-moon.js      rotating moon (Contact)
└── images/
    ├── logo.jpg           company logo
    ├── hero-nachos.jpg    hero shot
    ├── product-*.jpg      the three flavours
    ├── moon-hq.jpg        lunar headquarters
    └── team/              the eight executives
```

## Contact

📞 012345678 · ✉️ nachofesta@gmail.com · 📍 Sea of Tranquility, The Moon
