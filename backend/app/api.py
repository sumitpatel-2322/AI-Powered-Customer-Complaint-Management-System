import uuid
import io
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Dict, Any

import pdfplumber  # Replaced fitz for tabular data extraction
import pytesseract
from PIL import Image

from app.schemas import ChatRequest, ChatResponse
from app.models.complaint import ComplaintState, ChatMessage, Document
from app.models.enums import MessageRole, ComplaintStatus, ComplaintSource, DocumentType
from app.graph.workflow import graph

# Database imports
from app.database import SessionLocal
from app.models.db_models import DBComplaint

router = APIRouter()

# In-memory store for development to maintain conversation state
MEMORY_STORE = {}

def save_to_db(state: ComplaintState):
    """
    Saves or updates the complaint record in the PostgreSQL database.
    """
    db = SessionLocal()
    try:
        db_complaint = DBComplaint(
            id=state.conversation_id,
            product_name=state.product_name,
            batch_number=state.batch_number,
            manufacturer=state.manufacturer,
            strength=state.strength,
            dosage_form=state.dosage_form,
            manufacturing_date=state.manufacturing_date,
            expiry_date=state.expiry_date,
            affected_quantity=state.affected_quantity,
            complaint_category=state.complaint_category,
            description=state.description,
            location=state.location,
            customer_name=state.customer_name,
            customer_contact=state.customer_contact,
            originating_site_block=state.originating_site_block,
            impacted_non_product_material=state.impacted_non_product_material,
            severity=state.ai_analysis.severity.value if state.ai_analysis.severity else None,
            priority=state.ai_analysis.priority.value if state.ai_analysis.priority else None,
            risk_assessment=state.ai_analysis.risk_assessment,
            summary=state.ai_analysis.summary,
            recommended_action=state.ai_analysis.recommended_action,
            status=state.status.value if state.status else "Committed",
            source=state.source.value if state.source else "chat"
        )
        # merge will INSERT if the ID doesn't exist, and UPDATE if it does
        db.merge(db_complaint)
        db.commit()
        print(f"\n✅ SUCCESSFULLY COMMITTED TO DB: {state.conversation_id}\n")
    except Exception as e:
        db.rollback()
        print(f"\n❌ DATABASE ERROR: {str(e)}\n")
        raise e
    finally:
        db.close()


def check_for_duplicates(state: ComplaintState) -> str:
    """
    Checks the database for an existing complaint with the same core details.
    Uses Customer Name, Contact, Product Name, and Batch Number.
    """
    if not (state.product_name and state.batch_number and state.customer_name and state.customer_contact):
        return None
        
    db = SessionLocal()
    try:
        duplicate = db.query(DBComplaint).filter(
            DBComplaint.product_name == state.product_name,
            DBComplaint.batch_number == state.batch_number,
            DBComplaint.customer_name == state.customer_name,
            DBComplaint.customer_contact == state.customer_contact,
            DBComplaint.id != state.conversation_id
        ).first()
        
        if duplicate:
            return duplicate.id
    finally:
        db.close()
    return None


@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    try:
        conversation_id = request.conversation_id or str(uuid.uuid4())
        
        if conversation_id in MEMORY_STORE:
            state = MEMORY_STORE[conversation_id]
            state.user_input = request.user_input
        else:
            state = ComplaintState(
                conversation_id=conversation_id,
                user_input=request.user_input,
                source=ComplaintSource.CHAT
            )

        # Record user message in history
        state.chat_history.append(
            ChatMessage(role=MessageRole.USER, message=request.user_input)
        )

        # Chat-based Commit Intercept
        if "commit" in request.user_input.lower() and state.is_complete:
            state.status = ComplaintStatus.COMMITTED
            save_to_db(state)
            reply = "I have successfully committed the complaint to the database."
            
            state.chat_history.append(ChatMessage(role=MessageRole.ASSISTANT, message=reply))
            MEMORY_STORE[conversation_id] = state
            return ChatResponse(conversation_id=conversation_id, message=reply, state=state)

        # Invoke LangGraph Workflow
        updated_state_dict = graph.invoke(state)
        updated_state = ComplaintState(**updated_state_dict)

        # --- NEW DUPLICATE CHECK ---
        duplicate_id = check_for_duplicates(updated_state)

        # Formulate Assistant Response
        if duplicate_id:
            reply = f"⚠️ **Duplicate Detected**: It appears you have already lodged this complaint. The existing reference ID is `{duplicate_id}`."
        elif updated_state.awaiting_user:
            missing_items = updated_state.validation_errors + updated_state.ai_analysis.missing_fields
            missing_str = ", ".join(set(missing_items)) 
            reply = f"I need a bit more information to complete this complaint. Could you please provide: {missing_str}?"
        elif updated_state.is_complete:
            reply = f"Thank you. The complaint for {updated_state.product_name or 'the product'} has been fully processed. You can review the details in the form, and say 'commit the complaint' when you are ready."
        else:
            reply = "I am processing your request..."

        # Record assistant message in history
        updated_state.chat_history.append(
            ChatMessage(role=MessageRole.ASSISTANT, message=reply)
        )

        MEMORY_STORE[conversation_id] = updated_state

        return ChatResponse(
            conversation_id=conversation_id,
            message=reply,
            state=updated_state
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


@router.post("/upload", response_model=ChatResponse)
async def process_upload(
    conversation_id: str = Form(None),
    file: UploadFile = File(...)
):
    """
    Extracts text from uploaded PDFs or Images via OCR, 
    then pipes the text into the LangGraph workflow.
    """
    try:
        extracted_text = ""
        file_bytes = await file.read()
        doc_type = DocumentType.TEXT
        
        # 1. Perform OCR / Text Extraction with table support
        if file.content_type == "application/pdf":
            doc_type = DocumentType.PDF
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    # Extract raw text
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
                    
                    # Extract tables separately and format them to retain structure
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            clean_row = [str(cell).strip() if cell else "" for cell in row]
                            extracted_text += " | ".join(clean_row) + "\n"
                
        elif file.content_type and file.content_type.startswith("image/"):
            doc_type = DocumentType.IMAGE
            image = Image.open(io.BytesIO(file_bytes))
            extracted_text = pytesseract.image_to_string(image)
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF or Image.")

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any readable text from the document.")

        # 2. Setup State
        conv_id = conversation_id or str(uuid.uuid4())
        if conv_id in MEMORY_STORE:
            state = MEMORY_STORE[conv_id]
            state.user_input = extracted_text
        else:
            state = ComplaintState(
                conversation_id=conv_id,
                user_input=extracted_text,
                source=ComplaintSource.PDF if doc_type == DocumentType.PDF else ComplaintSource.IMAGE
            )
            
        # Log the document in state
        state.documents.append(
            Document(filename=file.filename, document_type=doc_type, content=extracted_text)
        )
        
        # Provide visual context in chat
        chat_msg = f"[Uploaded Document: {file.filename}]"
        state.chat_history.append(ChatMessage(role=MessageRole.USER, message=chat_msg))

        # 3. Invoke LangGraph Workflow
        updated_state_dict = graph.invoke(state)
        updated_state = ComplaintState(**updated_state_dict)

        # --- NEW DUPLICATE CHECK ---
        duplicate_id = check_for_duplicates(updated_state)

        # 4. Formulate Response
        if duplicate_id:
            reply = f"⚠️ **Duplicate Detected**: It appears you have already lodged this complaint. The existing reference ID is `{duplicate_id}`."
        elif updated_state.awaiting_user:
            missing_items = updated_state.validation_errors + updated_state.ai_analysis.missing_fields
            reply = f"I extracted the document, but I'm missing some info: {', '.join(set(missing_items))}."
        else:
            reply = f"I successfully extracted and analyzed '{file.filename}'. Everything looks complete."

        updated_state.chat_history.append(ChatMessage(role=MessageRole.ASSISTANT, message=reply))
        MEMORY_STORE[conv_id] = updated_state

        return ChatResponse(
            conversation_id=conv_id,
            message=reply,
            state=updated_state
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")


@router.put("/edit/{conversation_id}", response_model=ComplaintState)
async def edit_complaint(conversation_id: str, updates: Dict[str, Any] = Body(...)):
    """
    Allows the frontend to send manual edits made directly inside the form.
    """
    if conversation_id not in MEMORY_STORE:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    state = MEMORY_STORE[conversation_id]
    
    for key, value in updates.items():
        if hasattr(state, key):
            setattr(state, key, value)
            
    # Simple re-validation logic
    missing = []
    if not state.product_name: missing.append("Product Name is required.")
    if not state.batch_number: missing.append("Batch Number is required.")
    if not state.description: missing.append("Complaint Description is required.")
    
    state.validation_errors = missing
    state.is_complete = len(missing) == 0
    state.awaiting_user = len(missing) > 0

    MEMORY_STORE[conversation_id] = state
    return state


@router.post("/commit/{conversation_id}")
async def commit_complaint(conversation_id: str):
    """
    Explicit endpoint for the UI 'Commit' button.
    """
    if conversation_id not in MEMORY_STORE:
        raise HTTPException(status_code=404, detail="Conversation not found.")
        
    state = MEMORY_STORE[conversation_id]
    
    if not state.is_complete:
        raise HTTPException(status_code=400, detail="Cannot commit an incomplete complaint.")
        
    # Mark as committed and save to db
    state.status = ComplaintStatus.COMMITTED
    save_to_db(state)
    
    state.chat_history.append(ChatMessage(role=MessageRole.SYSTEM, message="Complaint committed via UI."))
    MEMORY_STORE[conversation_id] = state
    
    return {"status": "success", "message": "Complaint committed successfully.", "state": state}