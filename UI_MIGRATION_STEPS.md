# UI Migration Steps: icampus-dbs → new-lms-front Style

This document outlines the steps to migrate the UI of `icampus-dbs` to match the look and feel of `new-lms-front`.

## Overview

**Current State (icampus-dbs):**
- Uses CSS Modules for styling
- Uses React Icons (Fa*)
- Custom Layout with Header, Sidebar, Footer
- Modern React approach

**Target State (new-lms-front):**
- Uses Bootstrap 5.3.5 + React Bootstrap
- Uses FontAwesome icons (fe fe-* classes)
- Uses pre-built CSS from `/public/assets/css/style.min.css`
- Traditional admin dashboard layout

---

## Step-by-Step Migration Plan

### Step 1: Install Required Dependencies

Install Bootstrap, React Bootstrap, and FontAwesome:

```bash
cd /Users/krishnagohil/Documents/Personal/krishna/icampus-dbs
npm install bootstrap@^5.3.5 react-bootstrap@^2.10.9
npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
```

### Step 2: Copy CSS Assets

1. Copy the CSS files from `new-lms-front/public/assets/css/` to `icampus-dbs/public/assets/css/`:
   - `style.min.css`
   - `dark.css`
   - `default.css`
   - `theme1.css`

2. Copy the Bootstrap CSS from `new-lms-front/public/assets/plugins/bootstrap/css/bootstrap.min.css` to `icampus-dbs/public/assets/plugins/bootstrap/css/bootstrap.min.css`

### Step 3: Update public/index.html

Update the HTML file to include Bootstrap CSS and the custom style.min.css:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/react.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>iCampus DBS</title>
    
    <!-- CSS -->
    <link rel="stylesheet" href="%PUBLIC_URL%/assets/plugins/bootstrap/css/bootstrap.min.css" />
    <link rel="stylesheet" href="%PUBLIC_URL%/assets/css/style.min.css" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### Step 4: Update Layout Structure

The `new-lms-front` uses a different layout structure:
- `LeftSidebar` component (instead of custom Sidebar)
- `HeaderTop` component (instead of custom Header)
- `RightSidebar` component (optional)
- `Footer` component

You'll need to:
1. Create/update components to match the structure
2. Update `Layout.jsx` to use the new structure
3. Replace CSS Modules with Bootstrap classes

### Step 5: Replace React Icons with FontAwesome

Replace all `react-icons` imports with FontAwesome:
- Change `FaHome` → `<i className="fa fa-home"></i>`
- Change `FaUser` → `<i className="fe fe-user"></i>`
- Update all icon usages throughout components

### Step 6: Update Component Styling

Convert CSS Modules to Bootstrap classes:
- Replace custom CSS classes with Bootstrap utility classes
- Use Bootstrap components (Card, Button, Nav, etc.) from react-bootstrap
- Match the color scheme and spacing from new-lms-front

### Step 7: Update Sidebar Component

Transform the current `Sidebar.jsx` to match `LeftSidebar.js`:
- Use Bootstrap classes instead of CSS Modules
- Use FontAwesome icons
- Match the menu structure and styling
- Implement role-based menu items

### Step 8: Update Header Component

Transform the current `Header.jsx` to match `HeaderTop.js`:
- Use Bootstrap classes
- Use FontAwesome icons
- Match the header structure and styling
- Keep the dropdown functionality but style with Bootstrap

### Step 9: Update Main Content Area

Update the main content area styling:
- Use Bootstrap container/row/col classes
- Match padding and spacing
- Use Bootstrap cards for content sections

### Step 10: Test and Refine

1. Test all pages and components
2. Ensure responsive design works
3. Match colors, fonts, and spacing
4. Verify all icons display correctly
5. Test dark theme if applicable

---

## Key Differences to Address

### CSS Approach
- **Current**: CSS Modules (`.module.css` files)
- **Target**: Bootstrap classes + global CSS from `style.min.css`

### Icons
- **Current**: React Icons (`react-icons/fa`)
- **Target**: FontAwesome (`fe fe-*` classes)

### Layout Structure
- **Current**: Custom Layout with CSS Modules
- **Target**: Bootstrap-based layout with global CSS

### Components
- **Current**: Custom styled components
- **Target**: React Bootstrap components + Bootstrap classes

---

## Files to Modify

1. `package.json` - Add dependencies
2. `public/index.html` - Add CSS links
3. `src/Layout.jsx` - Update structure
4. `src/components/Header.jsx` - Convert to Bootstrap
5. `src/components/Sidebar.jsx` - Convert to Bootstrap
6. `src/components/Footer.jsx` - Convert to Bootstrap
7. All page components - Update to use Bootstrap classes
8. Remove CSS Module files (`.module.css`) or convert to global CSS

---

## Estimated Time

- Step 1-2: 15 minutes (Installation & Asset Copy)
- Step 3: 5 minutes (HTML Update)
- Step 4-8: 2-4 hours (Component Updates)
- Step 9: 1-2 hours (Content Area Updates)
- Step 10: 1 hour (Testing)

**Total: 4-7 hours** depending on the number of components and pages.

---

## Notes

- Keep the existing functionality intact while changing the UI
- Test each component after conversion
- Consider creating a backup branch before starting
- You may need to copy additional assets (images, fonts) from new-lms-front if referenced in CSS

