
# QMS Copilot — AI-Powered Pharmaceutical Complaint Intake System

QMS Copilot replaces manual complaint logging with an AI assistant that reads a
complaint — pasted text, a customer email, a PDF, or a scanned image — and
turns it into a structured, validated record ready to commit to the QMS
Ledger.

```
Unstructured Complaint (Text / Email / PDF / Image)
        │
        ▼
   AI Copilot (LangGraph + Groq LLM)
        │
        ├── Intent Detection      (create / edit / query)
        ├── Entity Extraction     (product, batch, dates, customer, etc.)
        ├── Validation            (deterministic required-field checks)
        ├── Risk Assessment       (severity, priority, recommended action)
        └── Duplicate Check
        │
        ▼
Structured Complaint Record → Ready to Commit → QMS Ledger (PostgreSQL)
```

The UI is two synced panels: a chat panel on the left where you talk to the
Copilot, and a read-only structured form on the right that fills itself in as
the Copilot processes your input. You never type into the form directly —
everything happens through conversation or file upload.

---

## Tech Stack

| Layer            | Technology                                                    |
| ---------------- | ------------------------------------------------------------- |
| Frontend         | React 18 + Redux Toolkit + Vite                               |
| Backend          | FastAPI                                                       |
| AI Orchestration | LangGraph                                                     |
| LLM              | Groq (`llama-3.3-70b-versatile`)                            |
| Database         | PostgreSQL (via SQLAlchemy)                                   |
| Document Parsing | `pdfplumber` (PDF text/tables), `pytesseract` (image OCR) |

---

## Prerequisites

Install these before you start:

- **Python 3.11**
- **Node.js 18+** and npm
- **PostgreSQL** (running locally or a connection string to a hosted instance)
- **Tesseract OCR** — required by `pytesseract` for image uploads. This is a
  system binary, not a Python package:
  - macOS: `brew install tesseract`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr`
  - Windows: install from the [UB-Mannheim Tesseract build](https://github.com/UB-Mannheim/tesseract/wiki) and add it to your `PATH`
- **A Groq API key** — get one at [console.groq.com](https://console.groq.com)

---

## 1. Backend Setup

### 1.1 Create a virtual environment

Using `venv`:

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
```

Or using conda (an `environment.yml` is provided):

```bash
cd backend
conda env create -f environment.yml
conda activate qms-automated
```

### 1.2 Install dependencies

```bash
pip install -r requirements.txt
```

### 1.3 Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

`backend/.env` needs:

```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
GROQ_API_KEY=<your-groq-api-key>
```

Make sure the database in `DATABASE_URL` already exists on your PostgreSQL
server (create it with `createdb qms_copilot` or via your DB client) — the
app creates its own tables on startup but not the database itself.

### 1.4 Run the backend

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`, with interactive docs
at `http://localhost:8000/docs`. On first run, `main.py` automatically
creates the `complaints` table in your database.

---

## 2. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000` (or whatever port Vite
assigns — check the terminal output). The frontend talks to the backend at
`http://localhost:8000/api` (hardcoded in
`frontend/src/store/complaintSlice.js` — change this if you deploy the
backend elsewhere).

**Important:** start the backend before the frontend, since the app tries to
reach `http://localhost:8000/api` as soon as it loads.

---

## 3. Using the App — Tools & Features

### 🗨️ Lodge Complaint (Chat / Text)

Paste a raw customer complaint, email, or free-text description directly into
the chat box and hit send. The Copilot:

1. Detects your intent (creating a new complaint vs. editing vs. asking a
   question).
2. Extracts every identifiable field — customer, product, batch number,
   manufacturer, strength, dosage form, manufacturing/expiry dates, affected
   quantity, complaint category, description, originating site block, and
   impacted material.
3. Runs an initial risk assessment — severity, priority, a summary, a
   detailed risk reasoning, and a recommended next QA action.
4. Populates the form on the right automatically. No manual data entry.

If required fields are missing (Product Name, Batch Number, Description,
Expiry Date, Complaint Category, Severity, Priority, Summary, Risk
Assessment, Recommended Action), the Copilot tells you exactly what's still
needed and the status stays **Pending Triage**.

### 📎 Upload Tool (PDF / Image)

Use the upload widget (or drag-and-drop) in the chat panel to submit a
complaint as a document instead of typing it:

- **PDF** — text and tables are extracted with `pdfplumber` (works for
  digitally generated PDFs with a text layer; scanned/image-only PDFs are not
  currently OCR'd).
- **Image** (JPG/PNG) — text is extracted via `pytesseract` OCR.

The extracted text is fed through the same extraction → validation → risk
assessment pipeline as a typed message, so uploading a PDF or photo of a
complaint form produces the same structured result as pasting the text
manually.

### ✏️ Edit Tool (Conversational Correction)

The form is intentionally **read-only** — you never edit it by hand. To
correct or update anything, just tell the Copilot in chat, e.g.:

> "Sorry, the batch number is BMX240603, and the affected quantity is 60
> capsules."

The Copilot detects this as an edit, updates **only** the fields you
mentioned, and leaves everything else in the record untouched — it doesn't
reprocess or wipe out the rest of the complaint. This also works after a
document upload: if you upload a PDF and then type a correction, only the
corrected field changes.

### ✅ Commit to QMS Ledger

Once every mandatory field is filled and the status reads **Ready to
Commit**, the button at the bottom of the form becomes active. Clicking it:

1. Saves the complaint into the PostgreSQL `complaints` table.
2. Marks the record's status as **Committed**.
3. Locks the chat input — you'll need to start a new conversation to log
   another complaint.

You can also commit by typing "commit" in the chat once the complaint is
complete — both paths hit the same backend logic.

### 🔁 Duplicate Detection

Before finalizing, the backend checks whether a complaint with the same
product name, batch number, customer name, and customer contact has already
been logged. If a match is found, you're shown the existing reference ID
instead of creating a duplicate record.

---

## 4. API Reference (Backend)

| Method | Endpoint                          | Purpose                                                                     |
| ------ | --------------------------------- | --------------------------------------------------------------------------- |
| POST   | `/api/chat`                     | Send a text message; runs the full LangGraph workflow                       |
| POST   | `/api/upload`                   | Upload a PDF or image; extracts text then runs the workflow                 |
| PUT    | `/api/edit/{conversation_id}`   | Directly patch fields on a complaint (used internally; the UI is read-only) |
| POST   | `/api/commit/{conversation_id}` | Commit a completed complaint to the database                                |

Full interactive documentation (request/response schemas) is available at
`http://localhost:8000/docs` once the backend is running.

---

## 5. Project Structure

```
QMS-Copilot/
├── backend/
│   ├── app/
│   │   ├── api.py           # API routes (chat, upload, edit, commit)
│   │   ├── main.py          # FastAPI app entrypoint, CORS, table creation
│   │   ├── database.py      # SQLAlchemy engine/session setup
│   │   ├── schemas.py       # Request/response Pydantic models
│   │   ├── models/
│   │   │   ├── complaint.py # ComplaintState — the LangGraph workflow state
│   │   │   ├── db_models.py # SQLAlchemy ORM model for the complaints table
│   │   │   └── enums.py     # Status, source, severity, priority, etc.
│   │   └── graph/
│   │       ├── workflow.py  # LangGraph node definitions and graph wiring
│   │       ├── prompts.py   # LLM prompt templates
│   │       └── llm.py       # Groq client wrapper
│   ├── requirements.txt
│   ├── environment.yml
│   └── .env.example
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── CopilotChat.jsx    # Chat panel + upload widget
│       │   ├── ComplaintForm.jsx  # Read-only structured form + commit button
│       │   └── FileUpload.jsx     # Drag-and-drop / click-to-upload control
│       └── store/
│           └── complaintSlice.js  # Redux state + API calls
└── README.md
```

---

## 6. Testing

Three sample complaints (text, PDF, and image) covering different defect
scenarios are useful for exercising all three intake paths end-to-end —
paste the text one into chat, and upload the PDF and image through the
upload widget to confirm extraction, risk assessment, and the commit flow
all work as expected.

---

## 7. Known Limitations

- Scanned/image-only PDFs (no text layer) are not OCR'd — only PDFs with
  extractable text are supported. Photos/scans should be uploaded as images
  instead.
- Only PDF and image uploads are supported; DOCX and EML files are not yet
  handled by the upload endpoint.
- `Investigation`, `CAPA`, and `Closed` complaint statuses are defined but
  not yet reachable — the workflow currently stops at `Committed`.
