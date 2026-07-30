from pydantic import BaseModel
from typing import Optional
from app.models.complaint import ComplaintState

class ChatRequest(BaseModel):
    """Payload received from the frontend."""
    user_input: str
    conversation_id: Optional[str] = None
    
class ChatResponse(BaseModel):
    """Response sent back to the frontend."""
    conversation_id: str
    message: str
    state: ComplaintState

class ErrorResponse(BaseModel):
    """Standardized error response."""
    detail: str