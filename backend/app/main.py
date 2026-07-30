from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import database engine and models
from app.database import engine
from app.models.db_models import Base

# Import your API router
from app.api import router

# Automatically create all tables in PostgreSQL on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="QMS Copilot API")

# Configure CORS so the React frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the routes we created in api.py
app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "QMS Copilot Backend is running."}