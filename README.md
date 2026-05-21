# AI Learning & Delivery Operations Copilot

A demo-ready MVP for a futuristic agentic AI dashboard that helps Learning & Delivery Managers automate planning, meeting follow-up, learning content creation, and wellness coaching.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Lucide React, Framer Motion
- Backend: FastAPI, Pydantic, SQLite-ready structure
- AI layer: Simulated modular agents

## Project Structure

```text
backend/
  app/
    main.py
    database.py
    routes/
    schemas/
    services/
frontend/
  src/
    components/
    hooks/
    layouts/
    pages/
    services/
    utils/
```

## Run Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

Create `backend/.env` with:

```bash
OPENAI_API_KEY=your_openai_api_key_here
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SENDER_EMAIL=lia-agent@example.com
```

Meeting analysis uses the OpenAI Python SDK with `gpt-4o-mini`. The app never hardcodes API keys, and `backend/.env` is ignored by git.

If port 8000 is already occupied, run:

```bash
uvicorn app.main:app --reload --port 8010
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://127.0.0.1:5174

This workspace includes `frontend/.env.local` pointing to `http://127.0.0.1:8010` because port 8000 is currently occupied locally. For a clean machine or deployment, use `frontend/.env.example` as the baseline.

## Demo Flow

1. Log in with any email and password.
2. Open Dashboard to see autonomous agent metrics.
3. Visit AI Planner and generate today’s delivery plan.
4. Paste or use the sample transcript in Meeting Summarizer.
5. Generate a course in Learning Generator.
6. Analyze workload in Wellness Coach.

## API Endpoints

- `POST /planner/generate`
- `POST /meeting/summarize`
- `POST /meetings/upload`
- `POST /meetings/ingest-link`
- `POST /meetings/ingest-embed`
- `POST /meetings/analyze`
- `GET /meetings`
- `GET /meetings/{id}`
- `POST /reports/generate`
- `POST /emails/generate`
- `POST /learning/generate`
- `POST /wellness/analyze`
- `GET /health`

All AI responses are deterministic mock outputs designed for stable judging demos.

## Meeting Intelligence Demo

Open `Meeting Intel` in the sidebar.

1. Upload a `.txt` or `.docx` transcript, or paste the sample Teams transcript.
2. Alternatively paste a Teams, Stream, or SharePoint meeting link.
3. Alternatively paste an iframe/embed recording snippet.
4. Review detected platform, parsed URL, ingestion status, metadata, and transcript preview.
5. Run AI analysis to extract summary, decisions, action items, deadlines, blockers, risks, and stakeholders.
6. Generate manager reports and stakeholder follow-up emails.
7. Open Historical Analytics to see stored meeting intelligence from SQLite.

The ingestion pipeline is demo-stable by design: if a transcript cannot be extracted from a file, link, or embed code, the backend automatically creates a realistic Learning & Delivery operations transcript. Meeting analysis is powered by OpenAI; if the API key is missing, invalid, rate-limited, or unavailable, the backend returns a clear error for the frontend to display.
