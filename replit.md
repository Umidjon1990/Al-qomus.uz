# Overview

QOMUS.UZ is a professional Arabic-to-Uzbek dictionary web application. The platform provides comprehensive word definitions, grammatical analysis, transliteration, and contextual examples. It features an admin interface for managing dictionary entries and supports bulk data import from Excel files. The application uses AI-powered translation capabilities to assist with content generation.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Technology Stack

**Frontend:**
- React with TypeScript for UI components
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS with custom theming (emerald green and gold color scheme)
- Framer Motion for animations

**Backend:**
- Express.js server running on Node.js
- TypeScript for type safety across the stack
- RESTful API architecture

**Database:**
- PostgreSQL as the primary database
- Drizzle ORM for type-safe database operations
- Schema-first approach with migrations stored in `/migrations`

**AI Integration:**
- OpenAI API for Arabic-to-Uzbek translation
- Custom word metadata extraction and analysis
- Batch translation capabilities

## Project Structure

The application follows a monorepo structure with clear separation of concerns:

- `/client` - Frontend React application
  - `/src/components` - Reusable UI components
  - `/src/pages` - Page-level components
  - `/src/lib` - Utility functions and API client
- `/server` - Backend Express application
  - `routes.ts` - API endpoint definitions
  - `storage.ts` - Database abstraction layer
  - `ai.ts` - AI integration logic
- `/shared` - Code shared between client and server
  - `schema.ts` - Database schema and Zod validation schemas

## Data Model

**Dictionary Entries:**
- Arabic word and definition
- Uzbek translation
- Transliteration (Latin script)
- Word type classification (verb, noun, adjective, etc.)
- Root word extraction
- Examples stored as JSON
- Timestamps for creation and updates

**Users:**
- Basic authentication with username/password
- Role-based access control (admin/user)
- UUID-based identification

## Key Features

**Search Functionality:**
- Real-time debounced search across Arabic and Uzbek fields
- Search applies to both word and definition fields

**Admin Interface:**
- CRUD operations for dictionary entries
- Excel file import for bulk data loading
- AI-powered batch translation
- Filter views (all, translated, pending)
- Pagination for large datasets

**Translation Workflow:**
- Excel files are processed to extract Arabic words and definitions
- AI analyzes word metadata (type, forms, grammatical features)
- Batch translation generates Uzbek equivalents
- Manual review and editing capability

## Build and Deployment

**Development:**
- Concurrent client and server development servers
- Vite HMR for fast frontend iteration
- TypeScript type checking across the stack

**Production:**
- Client built with Vite to `/dist/public`
- Server bundled with esbuild to `/dist/index.cjs`
- Selected dependencies bundled to reduce cold start times
- Static file serving from Express

**Build Optimizations:**
- Allowlist of server dependencies to bundle (reduces syscalls)
- External dependencies excluded from bundle
- Source maps for debugging

## Authentication

Currently implements mock authentication:
- Hardcoded admin credentials for development
- Session-based approach prepared (connect-pg-simple for PostgreSQL session store)
- Role-based UI rendering (admin vs. user views)

## Styling Approach

- Utility-first CSS with Tailwind
- Custom CSS variables for theming
- Arabic font (Amiri) for proper text rendering
- Inter for UI, Playfair Display for headings
- Responsive design with mobile-first approach
- Dark mode preparation via CSS custom properties

## API Design

RESTful endpoints following conventional patterns:
- `GET /api/dictionary` - List entries with optional search
- `GET /api/dictionary/:id` - Single entry retrieval
- `POST /api/dictionary` - Create entry
- `PATCH /api/dictionary/:id` - Update entry
- `DELETE /api/dictionary/:id` - Delete entry
- `GET /api/dictionary/stats` - Statistics (total, translated, pending)
- `POST /api/dictionary/import` - Bulk import from Excel
- `POST /api/dictionary/translate` - AI batch translation

# External Dependencies

**Database:**
- PostgreSQL (required via DATABASE_URL environment variable)
- Connection pooling via node-postgres (pg)

**AI Services:**
- OpenAI API (required via AI_INTEGRATIONS_OPENAI_API_KEY)
- Configurable base URL for API endpoint flexibility

**File Processing:**
- XLSX library for Excel file parsing
- Supports .xlsx format for dictionary imports

**UI Component Library:**
- Radix UI primitives for accessible components
- shadcn/ui component patterns (New York style variant)

**Fonts:**
- Google Fonts: Amiri (Arabic), Inter (UI), Playfair Display (headings)

**Development Tools:**
- Replit-specific plugins for development experience
- Vite plugins for runtime error overlay and meta image management

**Session Management:**
- connect-pg-simple for PostgreSQL-backed sessions (configured but not fully implemented)