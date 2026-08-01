# iCampus DBS - React Application

This is a React application built with Create React App, using modern ES6 import/export syntax and React Router for navigation.

## Features

- Modern React with ES6 modules
- React Router for navigation
- CSS Modules for styling
- Create React App build tool
- Hot reloading in development
- Optimized production builds

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd icampus-dbs
```

2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`

### Production Build

Create an optimized production build:

```bash
npm run build
```

The build files will be created in the `build/` directory.

### Testing

Run the test suite:

```bash
npm test
```

## Project Structure

```
icampus-dbs/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── index.js            # Application entry point
│   ├── App.jsx             # Main App component
│   ├── Layout.jsx          # Layout component
│   ├── routes.jsx          # Route definitions
│   ├── components/         # React components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   └── *.css              # CSS files
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Create production build
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (one-way operation)

## How It Works

1. **Entry Point**: `src/index.js` renders the main App component
2. **Routing**: React Router handles navigation between components
3. **Components**: All components use ES6 import/export syntax
4. **Styling**: CSS Modules provide scoped styling
5. **Build Tool**: Create React App handles bundling and optimization

## Deployment

The `build` folder contains the production-ready files. You can deploy these files to any static hosting service like:

- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Firebase Hosting

## Development Notes

- All components use standard ES6 import/export syntax
- CSS Modules are used for component-specific styling
- React Router v6 is used for navigation
- The application uses React 18+ features

## Troubleshooting

If you encounter any issues:

1. Make sure all dependencies are installed: `npm install`
2. Clear the cache: `npm start -- --reset-cache`
3. Check the console for error messages
4. Ensure you're using Node.js version 14 or higher
