# Project Pages - Developer Guide

## 📁 Modular System Overview

This folder contains project detail pages built with a **modular, component-based system** for easy maintenance and rapid development.

### Core Files

- **`_template.html`** - Copy this to create new project pages
- **`../css/project-pages.css`** - All reusable component styles
- **`../js/project-pages.js`** - Common functionality (modals, lazy loading, etc.)

---

## 🚀 Creating a New Project Page

### Quick Start

1. **Copy the template:**
   ```bash
   cp _template.html project-my-new-project.html
   ```

2. **Replace placeholders:**
   - Search for `[PROJECT NAME]`
   - Search for `[PLACEHOLDERS]` in brackets
   - Remove sections marked as "OPTIONAL" if not needed

3. **Add assets:**
   - Create folder: `../assets/my-project-name/`
   - Add images, videos, etc.

4. **Test:**
   - Open in browser
   - Check theme toggle
   - Test image gallery (click to zoom)
   - Verify all links

---

## 🧩 Available Components

### 1. Hero Section (Required)
```html
<div class="project-hero fade-in">
    <div class="project-tags">
        <span class="project-tag">AI-Powered</span>
        <span class="project-tag">Web Dev</span>
    </div>
    <h1 class="display-4 fw-bolder">Project Name</h1>
    <p class="lead">One-line description</p>
</div>
```

### 2. Video Container (Optional)
```html
<div class="video-container">
    <iframe src="YOUTUBE_EMBED_URL" ...></iframe>
</div>
```

### 3. Links Grid (Optional)
```html
<div class="links-grid">
    <a href="URL" class="link-card">
        <div class="link-card-icon">
            <i class="bi bi-github"></i>
        </div>
        <div class="link-card-content">
            <h4>Title</h4>
            <p>Description</p>
        </div>
    </a>
</div>
```

### 4. Project Card (Content)
```html
<div class="project-card">
    <p>Main content description...</p>
    <div class="tech-stack">
        <span class="tech-badge">React</span>
        <span class="tech-badge">Node.js</span>
    </div>
</div>
```

### 5. Feature Grid (Optional)
```html
<div class="feature-grid">
    <div class="feature-card">
        <div class="feature-icon">
            <i class="bi bi-stars"></i>
        </div>
        <h4>Feature Name</h4>
        <p>Description</p>
    </div>
</div>
```

### 6. Steps/Process (Optional)
```html
<div class="steps-grid">
    <div class="project-step">
        <div class="project-step-header">
            <div class="project-step-number">1</div>
            <h5>Step Title</h5>
        </div>
        <p>Step description</p>
    </div>
</div>
```

### 7. Image Gallery (Optional)
```html
<div class="image-gallery">
    <div class="gallery-item">
        <img src="../assets/project/image.png" alt="Description">
    </div>
</div>
```
*Note: Click-to-zoom is automatic via JS*

### 8. Back Button (Required)
```html
<a href="../projects.html" class="back-button">
    <i class="bi bi-arrow-left me-2"></i>
    Back to Projects
</a>
```

---

## 🎨 Styling Guidelines

### Colors (from design system)
- Primary accent: `var(--color-accent)` - #2563eb
- Text colors: `var(--color-text)`, `var(--color-text-secondary)`
- Background: `var(--color-bg)`, `var(--color-bg-alt)`
- Borders: `var(--color-border)`

### Spacing
- Use spacing variables: `var(--space-2)` through `var(--space-16)`
- Standard margins: `mb-5` for sections
- Container: Always use `<div class="container px-5">`

### Border Radius
- Cards/containers: `var(--radius-2xl)` - 16px
- Badges/pills: `var(--radius-full)` - 9999px
- Icons: `var(--radius-xl)` - 16px

### Icons
Use Bootstrap Icons: https://icons.getbootstrap.com/

**Common choices:**
- `bi-github` - GitHub links
- `bi-cloud-download` - Downloads
- `bi-play-circle` - Live demos
- `bi-stars` - AI/Special features
- `bi-building` - Environment/Architecture
- `bi-people` - Team/Collaboration
- `bi-code-slash` - Technical/Code
- `bi-palette` - Design/Creative

---

## ⚡ JavaScript Features

The `project-pages.js` module provides:

### 1. Image Modal (Automatic)
- Click any `.gallery-item` to enlarge
- ESC key or click outside to close
- No configuration needed

### 2. Smooth Scroll (Automatic)
- All anchor links scroll smoothly
- Works with section IDs

### 3. External Links (Automatic)
- Adds `rel="noopener noreferrer"`
- Opens in new tab

### 4. Video Lazy Load (Optional)
- Use `data-src` instead of `src` on iframe
- Video loads when scrolled into view
- Improves initial page load

---

## 📋 Checklist for New Pages

- [ ] Copy `_template.html` and rename
- [ ] Update `<title>` and meta description
- [ ] Replace all `[PLACEHOLDERS]`
- [ ] Add project tags
- [ ] Write compelling hero description
- [ ] Add external links (GitHub, Drive, Demo)
- [ ] Write about section
- [ ] Add tech stack badges
- [ ] Create features (if applicable)
- [ ] Add process steps (if applicable)
- [ ] Upload and link images
- [ ] Test in both light and dark themes
- [ ] Test responsive design (mobile, tablet)
- [ ] Verify all links work
- [ ] Check image gallery modal
- [ ] Update `projects.html` to link to new page

---

## 🔧 Customization

### Adding New Component Styles
Edit `../css/project-pages.css` to add new reusable components.

### Custom Page-Specific Styles
If a single page needs unique styling:
```html
<style>
    .my-custom-component {
        /* Your styles */
    }
</style>
```

### Modifying Existing Components
Edit the CSS class in `project-pages.css` - changes apply to all pages.

---

## 📝 Examples

- **Full Featured:** `project-neural-noir.html` (has everything)
- **Simple:** Other project pages (basic structure)
- **Template:** `_template.html` (starting point)

---

## 🐛 Troubleshooting

**Images not loading?**
- Check file path: `../assets/folder/image.png`
- Verify file exists in assets folder
- Check file name case sensitivity

**Modal not working?**
- Ensure `project-pages.js` is included
- Check browser console for errors
- Verify `.gallery-item` class on parent div

**Styling looks wrong?**
- Verify `project-pages.css` is included
- Check if conflicting inline styles exist
- Clear browser cache

**Dark mode issues?**
- CSS uses design system variables
- Test with theme toggle button
- Check if custom colors are hardcoded

---

## 💡 Best Practices

1. **Keep it DRY** - Use existing components, don't reinvent
2. **Semantic HTML** - Use proper heading hierarchy (h1 → h2 → h3)
3. **Alt text** - Always add descriptive alt text to images
4. **Loading** - Use `loading="lazy"` on images below fold
5. **Links** - External links should open in new tab
6. **Consistency** - Use same structure across all projects
7. **Mobile first** - Test on mobile devices
8. **Accessibility** - Ensure keyboard navigation works

---

## 📚 Resources

- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [Bootstrap Docs](https://getbootstrap.com/docs/5.2/)
- [Design System](../css/modern.css)
- [Main Site](../index.html)

---

**Questions?** Check existing project pages for examples or refer to the template comments.


