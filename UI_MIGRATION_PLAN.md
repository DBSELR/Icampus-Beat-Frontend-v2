# UI Migration Plan: Small Parts Approach

This document breaks down the UI migration into small, manageable parts.

## Migration Order

### ✅ Part 1: Setup & Dependencies

- Install Bootstrap 5.3.5
- Install React Bootstrap
- Install FontAwesome packages

### ✅ Part 2: Copy CSS Assets

- Copy CSS files from new-lms-front/public/assets/css/
- Copy Bootstrap CSS from new-lms-front/public/assets/plugins/bootstrap/

### ✅ Part 3: Update HTML

- Update public/index.html to include Bootstrap and custom CSS

### ✅ Part 4: Login Page (START HERE)

- Convert Login.jsx to use Bootstrap classes
- Replace CSS Modules with Bootstrap styling
- Replace SVG icons with FontAwesome
- Match the look of new-lms-front Login page

### Part 5: Header Component

- Convert Header.jsx to match HeaderTop.js structure
- Use Bootstrap classes
- Replace React Icons with FontAwesome

### Part 6: Sidebar Component

- Convert Sidebar.jsx to match LeftSidebar.js structure
- Use Bootstrap classes
- Replace React Icons with FontAwesome
- Implement role-based menu

### Part 7: Layout Component

- Update Layout.jsx to use Bootstrap layout structure
- Integrate Header and Sidebar properly

### Part 8: Footer Component

- Convert Footer to Bootstrap styling

### Part 9: Dashboard & Other Pages

- Update Dashboard and other pages incrementally

---

## Current Status

**Starting with Part 1-4: Setup and Login Page**
