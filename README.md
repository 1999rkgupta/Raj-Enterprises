# Raj Enterprises — Monorepo Workspace

A unified monorepo housing the backend API service, customer-facing store web application, admin console, and mobile application for Raj Enterprises.

---

## 🚀 Live Deployments

| Component | Service Provider | Live URL |
| :--- | :--- | :--- |
| **Backend API** | Render | [https://raj-enterprises-api.onrender.com](https://raj-enterprises-api.onrender.com) |
| **Customer Web App** | Vercel | [https://raj-enterprises-web.vercel.app](https://raj-enterprises-web.vercel.app) |
| **Admin Dashboard** | Vercel | [https://raj-enterprises-admin.vercel.app](https://raj-enterprises-admin.vercel.app) |

---

## 🛠️ Tech Stack & Workspace Architecture

This project is organized as a monorepo using **npm workspaces**:

```text
├── apps/
│   ├── api/          # FastAPI Python backend service
│   ├── web/          # React Vite customer web store
│   ├── admin/        # React Vite admin management panel
│   └── mobile/       # React Native Expo mobile catalog app
├── packages/
│   ├── shared-types/ # Shared TypeScript interface declarations
│   ├── shared-redux/ # Shared Redux logic (slices, store helpers)
│   └── api-client/   # Pre-configured Axios instance wrappers
```

---

## 💻 Local Setup & Development

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** (running locally on port 27017 or a cloud cluster link)

### 2. Installation
Install all Node.js workspace dependencies from the root directory:
```bash
npm install
```

Install backend Python dependencies:
```bash
cd apps/api
pip install -r requirements.txt
```

### 3. Environment Setup
Configure environment variables by creating `.env` files in their respective folders:

#### Backend Settings (`apps/api/.env`)
```ini
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=raj_enterprises
APP_ENV=development
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

#### Customer Web Settings (`apps/web/.env`)
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

#### Admin Console Settings (`apps/admin/.env`)
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### 4. Running Locally
Run all workspace projects concurrently in development mode from the root directory:
```bash
npm run dev
```

Or run individual packages:
- Web App: `npm run dev --workspace=@raj-enterprises/web`
- Admin App: `npm run dev --workspace=@raj-enterprises/admin`
- Backend API: `cd apps/api && uvicorn app.main:app --reload`
