# Schemact Website

> **Live Site:** [schemact.oxog.dev](https://schemact.oxog.dev) | **Repository:** [github.com/ersinkoc/schemact](https://github.com/ersinkoc/schemact)

Modern, responsive static website for Schemact built with:
- **Tailwind CSS** - Utility-first CSS framework
- **Alpine.js** - Lightweight JavaScript framework
- **shadcn UI** inspired design - Clean, modern component design

## Features

- ✨ Modern, clean design
- 📱 Fully responsive (mobile, tablet, desktop)
- 🎨 Tailwind CSS with custom theme
- ⚡ Alpine.js for interactivity
- 🚀 Zero build step required
- 📦 CDN-based (no npm dependencies for the website)
- 🌙 Ready for dark mode expansion

## Structure

```
website/
├── index.html          # Main landing page
├── assets/            # Static assets
│   ├── css/          # Custom CSS (if needed)
│   └── js/           # Custom JS (if needed)
└── docs/             # Documentation pages (future)
```

## Local Development

Simply open `index.html` in a browser:

```bash
# Using Python
python -m http.server 8000 --directory website

# Using Node.js
npx serve website

# Using PHP
php -S localhost:8000 -t website
```

Then visit: http://localhost:8000

## Deployment

The website is hosted at **schemact.oxog.dev**.

### Files

- `index.html` - Main landing page
- `docs.html` - Full documentation page

## Customization

### Colors

Edit the Tailwind config in the `<script>` tag in `index.html`:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: { /* Your colors */ },
                // ...
            }
        }
    }
}
```

### Content

All content is in `index.html`. Sections:
- Hero Section
- Features Section
- Stats Section
- Quick Start Section
- Footer

### Adding Pages

1. Create new HTML file in `website/`
2. Copy navigation from `index.html`
3. Link in navigation menu

## Technologies

- **Tailwind CSS v3** - Via CDN
- **Alpine.js v3** - Via CDN
- **Custom Theme** - shadcn UI inspired colors
- **No Build Step** - Pure static HTML

## Performance

- ✅ Fast load times
- ✅ CDN-based dependencies
- ✅ Minimal JavaScript
- ✅ Optimized for Core Web Vitals

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Same as Schemact repository

## Contributing

To improve the website:
1. Edit `website/index.html`
2. Test locally
3. Submit PR

## Credits

- Design inspired by shadcn UI
- Built with Tailwind CSS
- Powered by Alpine.js
