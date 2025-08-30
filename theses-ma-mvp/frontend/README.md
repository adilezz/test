# Theses.ma Frontend

Frontend React application for the Moroccan Academic Thesis Platform.

## 🚀 Features

- **Modern UI/UX**: Built with React 18 + TypeScript + Tailwind CSS
- **Advanced Search**: Intelligent search with filters, voice search, and suggestions
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Admin Interface**: Complete administration panel for content management
- **Authentication**: Secure user authentication and authorization
- **File Upload**: Drag & drop PDF upload with metadata extraction
- **Multilingual**: Support for French, Arabic, English, and Tamazight

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on port 5000

## 🛠️ Installation

1. **Clone and navigate to frontend directory:**
   ```bash
   cd theses-ma-mvp/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. **Start development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # Header, Footer, Navigation
│   ├── pages/           # Main application pages
│   ├── ui/              # Reusable UI components
│   └── admin/           # Admin interface components
├── contexts/            # React Context providers
├── services/            # API service functions
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── types/               # TypeScript type definitions
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 UI Components

### Layout Components
- **Header**: Navigation with search, user menu, notifications
- **Footer**: Links, contact info, language switcher
- **AdminLayout**: Admin panel sidebar and navigation

### Page Components
- **HomePage**: Hero section, featured theses, stats
- **SearchResultsPage**: Search interface with filters
- **ThesisDetailPage**: Detailed thesis view with download/citation
- **UploadPage**: Multi-step thesis submission process
- **ProfilePage**: User profile and thesis management
- **Authentication**: Login and registration pages

### UI Components
- **SearchBar**: Advanced search with voice input and suggestions
- **FilterPanel**: Dynamic filtering system
- **ThesisCard**: Thesis display in grid or list format

### Admin Components
- **AdminDashboard**: Overview statistics and quick actions
- **AdminThesesPage**: Thesis approval and management
- **AdminUsersPage**: User account management
- **AdminInstitutionsPage**: Institution configuration

## 🔐 Authentication

The app supports role-based access control:

- **Student**: Basic access, can upload theses
- **Researcher**: Extended access, advanced features
- **Professor**: Institution-level permissions
- **Admin**: Full system administration

## 🌐 API Integration

The frontend communicates with the backend API through:

- **RESTful endpoints**: Standard CRUD operations
- **File uploads**: Multipart form data for PDF files
- **Search API**: Advanced search with filtering
- **Admin API**: Administrative functions

## 📱 Responsive Design

- **Mobile-first**: Optimized for small screens
- **Tablet support**: Adapted layouts for medium screens
- **Desktop**: Full-featured interface
- **Touch-friendly**: Large tap targets and gestures

## 🎯 Key Features

### Search & Discovery
- Full-text search across theses
- Advanced filters (discipline, institution, language, year)
- Voice search support
- Search suggestions and history
- Related theses recommendations

### Thesis Management
- PDF upload with metadata extraction
- Citation generation (APA, MLA, Chicago, BibTeX)
- Download tracking and analytics
- Favorites system
- Social sharing

### Admin Features
- Thesis approval workflow
- User verification and management
- Institution and discipline configuration
- Analytics and reporting
- Bulk operations

## 🚀 Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Deploy the `dist` folder** to your web server or CDN.

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test your changes thoroughly

## 📄 License

This project is part of the theses.ma platform for Moroccan academic institutions.