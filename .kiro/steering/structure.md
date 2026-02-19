# Project Structure

## Directory Organization

```
src/
├── components/          # Reusable UI components
│   ├── Button.jsx
│   ├── Header.jsx
│   ├── IframeView.jsx
│   ├── Loader.jsx
│   ├── Sidebar.jsx
│   └── ToggleSidebar.jsx
├── pages/              # Page-level components (route targets)
│   ├── About.jsx
│   ├── Home.jsx
│   └── Portal.jsx
├── css/
│   ├── common.css      # Global styles
│   ├── components/     # Component-specific CSS Modules
│   └── pages/          # Page-specific CSS Modules
├── App.jsx             # Root component with routing
└── main.jsx            # Application entry point
```

## File Naming Conventions
- Components: PascalCase with `.jsx` extension (e.g., `Button.jsx`)
- CSS Modules: PascalCase with `.module.css` extension (e.g., `Button.module.css`)
- CSS Modules are imported as `styles` object

## Component Patterns
- Default exports for all components
- Functional components with hooks
- Props destructuring in function parameters
- CSS Modules imported and used via `styles` object

## Routing Structure
- React Router DOM for client-side routing
- Routes defined in `App.jsx`
- Page components in `src/pages/`

## Styling Organization
- Each component/page has a corresponding CSS Module
- CSS files mirror the component directory structure
- Global styles kept minimal in `common.css`
