# HOMLY — motion sources and component decisions

Revised 16 November 2026.

## Selected foundation

**Motion for JavaScript** — [Official docs](https://motion.dev/docs/quick-start), [inView](https://motion.dev/docs/inview), [scroll](https://motion.dev/docs/scroll). MIT licensed; imported at a pinned CDN version. It fits the existing static HTML/CSS/JavaScript architecture. If the library does not load, native IntersectionObserver reveal effects remain functional.

## Adapted interaction patterns (not copied React source)

- **Animata** — [Scroll reveal](https://animata.design/docs/text/scroll-reveal), [Text gallery](https://animata.design/docs/text): inspiration for separate viewport-triggered text entrances.
- **Aceternity UI** — [Explore](https://ui.aceternity.com/explore): focus-card hover and magnetic-button *behaviour*, recreated with Motion for the HTML storefront.
- **Eldora UI** — [Library](https://www.eldoraui.site/): reference for polished, purposeful micro-interactions and gentle image movement.

These libraries ship many React/Tailwind components, while this project is currently a lightweight static site. We have **not** pasted React JSX into plain JavaScript or migrated to a larger framework just for visual effects.

## Reviewed but not added

- **Anime.js** — [Official site](https://animejs.com/): great timeline/scroll engine. We chose one animation runtime (Motion) rather than shipping two overlapping engines.
- **Bklit** — [Components](https://bklit.com/): charts and data visualization library; no relevant storefront chart is needed right now.

## Motion map

| UI area | Behaviour |
| --- | --- |
| Each gallery tile | viewport-triggered image reveal and caption entry |
| Main headings | text rising precisely when scrolled into view |
| Product cards | image and metadata independently enter; works after filtering |
| Craft-box section | clip-path curtain opening and scroll-linked image parallax |
| Studio steps | each step animates on entry, preserving existing photo changes |
| Final section | scroll-linked photograph and image reveal |
| Buttons | magnetic arrow on fine-pointer devices |
| Global | reading progress bar, reduced-motion support |

**Important:** Temporary product photos and prices are not approved for a commercial launch. They must be replaced with real HOMLY assets.