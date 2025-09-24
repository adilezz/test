# Theses.ma - Enhanced UI

A modern, sophisticated user interface for the Moroccan academic thesis repository system. This React application provides an intuitive interface for exploring, searching, and managing academic theses with advanced filtering capabilities and hierarchical navigation.

## Features

### 🔍 Advanced Search & Filtering
- **Sophisticated Tree View**: Hierarchical navigation through universities, faculties, departments, and categories
- **Real-time Search**: Fuzzy search with auto-suggestions and highlighting
- **Multi-faceted Filters**: Filter by institution, category, language, degree, year range, and more
- **Smart Pagination**: Efficient pagination with virtual scrolling for large datasets

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Smooth Animations**: Framer Motion animations for enhanced user experience
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Dark/Light Themes**: Support for different visual preferences

### 🏛️ Institutional Hierarchy
- **University Tree View**: Navigate through Morocco's academic institutions
- **Lazy Loading**: Efficient data loading for large institutional hierarchies
- **Count Badges**: Display thesis counts for each institution/category
- **Multi-language Support**: French, Arabic, English, and Berber language support

### 📊 Rich Data Visualization
- **Statistics Dashboard**: Real-time statistics and popular categories
- **Thesis Cards**: Rich preview cards with metadata and actions
- **Download Management**: Bulk download capabilities with progress tracking
- **Citation Tools**: Export citations in various academic formats

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion
- **Routing**: React Router v6
- **State Management**: React Context + useReducer
- **HTTP Client**: Native Fetch API with custom service layer
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Running backend API (see main.py)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd UI-Enhanced
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to match your backend API URL:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Backend Setup

Ensure the Python backend API is running:

1. **Start the FastAPI server**
   ```bash
   cd /workspace
   python main.py
   ```

2. **Verify API is accessible**
   Visit `http://localhost:8000/docs` to see the API documentation

## Project Structure

```
UI-Enhanced/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, Footer, Layout components
│   │   ├── pages/           # Page components (Home, Search, Login, etc.)
│   │   └── ui/              # Reusable UI components
│   │       ├── TreeView/    # Hierarchical tree navigation
│   │       ├── EnhancedFilterPanel.tsx
│   │       ├── EnhancedThesisCard.tsx
│   │       └── LoadingSpinner.tsx
│   ├── contexts/           # React contexts (Auth, Search)
│   ├── services/          # API service layer
│   ├── types/             # TypeScript type definitions
│   └── index.css         # Global styles and Tailwind
├── public/               # Static assets
└── package.json         # Dependencies and scripts
```

## API Integration

The frontend integrates with the FastAPI backend through a comprehensive service layer:

### Authentication
- JWT-based authentication with automatic token refresh
- Protected routes and role-based access control
- User profile management

### Search & Filtering
- Advanced search with multiple parameters
- Real-time filtering with debounced requests
- Pagination with efficient data loading

### Hierarchical Data
- University/Faculty/Department tree structure
- Category taxonomy navigation
- Geographic entity organization
- Lazy loading for performance

### File Management
- Thesis file upload with progress tracking
- PDF preview and download capabilities
- Bulk operations support

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- **TypeScript**: Strict mode enabled with comprehensive type definitions
- **ESLint**: Configured for React and TypeScript best practices
- **Prettier**: Code formatting (configure in your editor)
- **Component Structure**: Functional components with hooks
- **State Management**: Context API with useReducer for complex state

### Adding New Features

1. **Create Components**: Add new components in appropriate directories
2. **Type Definitions**: Update types in `src/types/` to match API models
3. **API Integration**: Extend service layer in `src/services/api.ts`
4. **Routing**: Add routes in `src/App.tsx`
5. **Styling**: Use Tailwind classes and custom CSS variables

## Deployment

### Production Build

```bash
npm run build
```

The build artifacts will be in the `dist/` directory.

### Environment Variables

For production deployment, set:
- `VITE_API_BASE_URL`: Your production API URL
- `VITE_APP_TITLE`: Application title

### Hosting

The built application can be deployed to:
- **Vercel**: Zero-config deployment
- **Netlify**: Static site hosting
- **AWS S3 + CloudFront**: Scalable hosting
- **Docker**: Containerized deployment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: contact@theses.ma
- Documentation: `/docs` endpoint when API is running
- Issues: GitHub Issues section

---

Built with ❤️ for Moroccan academic research community.