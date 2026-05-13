# JobTech Solutions

A full-stack job board and applicant tracking system built with Django REST Framework and React + TypeScript + Vite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Django 4.2, Django REST Framework, SimpleJWT |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4, Zustand, React Query |
| **Database** | MySQL (via PyMySQL) |
| **Cache / Queue** | Redis, Celery |
| **Auth** | JWT with httpOnly refresh cookie |

## Project Structure

```
jobtech/
├── backend/           # Django REST API
│   ├── apps/
│   │   ├── users/     # Auth, profiles, admin user management
│   │   └── jobs/      # Job listings, applications
│   ├── config/        # Django settings (base, dev, prod)
│   ├── requirements/  # base.txt | dev.txt | prod.txt
│   └── manage.py
│
├── frontend/          # React SPA
│   ├── src/
│   │   ├── features/  # Domain-driven modules (auth, users, jobs)
│   │   ├── components/ui/
│   │   ├── pages/
│   │   └── api/       # Axios client + endpoint constants
│   └── index.html
│
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- MySQL 8+
- Redis

### Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements/base.txt

# 3. Environment variables — copy and edit
cp .env.example .env
# Edit .env with your database credentials and secret key

# 4. Run migrations
python manage.py migrate

# 5. Create superuser
python manage.py createsuperuser

# 6. Start server
python manage.py runserver
```

API will be available at `http://localhost:8000/api/v1/`

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

Frontend will be available at `http://localhost:5173/`

## Environment Variables

### Backend (`backend/.env`)

Copy from `.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key (generate new for production) |
| `DEBUG` | `True` for dev, `False` for production |
| `DB_*` | MySQL connection credentials |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend URLs |
| `JWT_COOKIE_SECURE` | `True` in production (HTTPS only) |

## Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |

### Backend

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Dev server |
| `python manage.py migrate` | Run migrations |
| `pytest` | Run tests |
| `celery -A config worker -l info` | Start Celery worker |

## Security Notes

- **Never commit `.env` files** — they contain secrets
- **Never commit `node_modules/` or `db.sqlite3`**
- JWT refresh tokens are stored in httpOnly cookies
- Production requires `DEBUG=False`, `JWT_COOKIE_SECURE=True`, HTTPS

## License

Proprietary — JobTech Solutions
# jobtech
