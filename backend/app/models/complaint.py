from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.enums import (
    ComplaintStatus,
    ComplaintSource,
    IntentType,
    Severity,
    Priority,
    MessageRole,
    DocumentType,
)

class Document(BaseModel):
    """Represents an uploaded document after processing."""
    filename: str
    document_type: DocumentType
    content: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    """Represents a single conversation message."""
    role: MessageRole
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AIAnalysis(BaseModel):
    """Stores all AI-generated outputs."""
    summary: Optional[str] = None
    severity: Optional[Severity] = None
    priority: Optional[Priority] = None
    risk_assessment: Optional[str] = None
    recommended_action: Optional[str] = None
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0 and 1",
    )
    missing_fields: List[str] = Field(default_factory=list)

class ComplaintState(BaseModel):
    """The single source of truth for the complaint and LangGraph workflow state."""
    
    # Core Workflow State
    user_input: Optional[str] = None
    conversation_id: Optional[str] = None
    awaiting_user: bool = False
    is_complete: bool = False
    validation_errors: List[str] = Field(default_factory=list)
    processing_notes: List[str] = Field(default_factory=list)
    
    # Complaint Metadata
    complaint_id: Optional[str] = None
    status: ComplaintStatus = ComplaintStatus.PENDING_TRIAGE
    manufacturing_date: Optional[str] = None # String to handle "Feb 2028" etc.
    expiry_date: Optional[str] = None        # String for flexible parsing
    affected_quantity: Optional[str] = None
    complaint_category: Optional[str] = None
    
    # Facility & Material Impact
    originating_site_block: Optional[str] = None
    impacted_non_product_material: Optional[str] = None
    source: ComplaintSource = ComplaintSource.CHAT
    intent: Optional[IntentType] = None
    received_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Product Information
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturer: Optional[str] = None
    # REMOVED DUPLICATE expiry_date: Optional[datetime] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    
    # Complaint Details
    description: Optional[str] = None
    complaint_type: Optional[str] = None
    event_date: Optional[str] = None         # Changed from datetime to str
    location: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    
    # AI Generated Information
    ai_analysis: AIAnalysis = Field(default_factory=AIAnalysis)
    
    # Supporting Data
    documents: List[Document] = Field(default_factory=list)
    chat_history: List[ChatMessage] = Field(default_factory=list)
    
    # System Metadata
    version: int = 1
    last_updated: datetime = Field(default_factory=datetime.utcnow)