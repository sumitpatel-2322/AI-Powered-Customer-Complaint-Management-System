from datetime import datetime
from langgraph.graph import StateGraph, START, END

from app.models.complaint import ComplaintState
from app.models.enums import Severity, Priority, ComplaintSource, IntentType, ComplaintStatus
from app.graph.llm import generate_json_response, generate_response
from app.graph.prompts import EXTRACTION_PROMPT, INTENT_PROMPT, RISK_ASSESSMENT_PROMPT

# ============================
# Helper Functions
# ============================
def format_chat_history(chat_history):
    """Formats the chat history for the LLM prompt."""
    return "\n".join([f"{msg.role.upper()}: {msg.message}" for msg in chat_history])

# ============================
# Node Functions
# ============================

def input_detection_node(state: ComplaintState) -> ComplaintState:
    """Determines the source of input (chat, image, PDF, email)."""
    if not state.source:
        state.source = ComplaintSource.CHAT
    return state

def intent_detection_node(state: ComplaintState) -> ComplaintState:
    """Determines whether the user wants to CREATE, EDIT, or QUERY a complaint."""
    if not state.user_input:
        if not state.intent:
            state.intent = IntentType.CREATE
        return state
        
    prompt = f"{INTENT_PROMPT}\n\nUser Input: {state.user_input}"
    
    # Use simple text generation for intent (only needs 1 word)
    response = generate_response(prompt, max_tokens=10).strip().upper()
    
    if "EDIT" in response:
        state.intent = IntentType.EDIT
    elif "QUERY" in response:
        state.intent = IntentType.QUERY
    else:
        state.intent = IntentType.CREATE
        
    state.processing_notes.append(f"Intent detected: {state.intent.value}")
    return state

def extraction_node(state: ComplaintState) -> ComplaintState:
    """
    Intelligently extracts and merges data.
    Only updates state fields if the LLM successfully extracted a new value,
    preserving historical data during multi-turn conversations and edits.
    """
    # Skip extraction if it is strictly a query
    if state.intent == IntentType.QUERY:
        return state

    prompt = EXTRACTION_PROMPT.format(
        intent=state.intent.value if state.intent else "",
        chat_history=format_chat_history(state.chat_history),
        complaint_text=state.user_input or "",
    )
    
    data = generate_json_response(prompt)
    
    # -------------------------
    # Safe Merge Logic 
    # -------------------------
    # Only overwrite if the newly extracted value is truthy (not null/empty)
    fields_to_merge = [
        "product_name", "batch_number", "manufacturer", "strength", "dosage_form", 
        "manufacturing_date", "expiry_date", "affected_quantity", "complaint_category", 
        "description", "location", "customer_name", "customer_contact", 
        "originating_site_block", "impacted_non_product_material"
    ]
    
    for key in fields_to_merge:
        if data.get(key): 
            setattr(state, key, data.get(key))
    
    return state

def validation_node(state: ComplaintState) -> ComplaintState:
    """
    Deterministic rule-based validation of required fields.
    This acts as the absolute source of truth and overrides any AI hallucinations.
    """
    state.validation_errors = []
    actual_missing_fields = []
    
    if not state.product_name:
        state.validation_errors.append("Product Name is required.")
        actual_missing_fields.append("product_name")
        
    if not state.batch_number:
        state.validation_errors.append("Batch Number is required.")
        actual_missing_fields.append("batch_number")
        
    if not state.description:
        state.validation_errors.append("Complaint Description is required.")
        actual_missing_fields.append("description")
        
    # FORCE override the LLM's missing fields with the deterministic reality
    state.ai_analysis.missing_fields = actual_missing_fields
        
    return state

def risk_assessment_node(state: ComplaintState) -> ComplaintState:
    """
    Generates the risk assessment and recommended actions.
    """
    if state.intent == IntentType.QUERY:
        return state

    # Create a string representation of the current state for the LLM
    details = f"Product: {state.product_name}, Batch: {state.batch_number}, Description: {state.description}"
    
    prompt = RISK_ASSESSMENT_PROMPT.format(complaint_details=details)
    data = generate_json_response(prompt)
    
    if data.get("severity"):
        try: 
            state.ai_analysis.severity = Severity(data.get("severity").lower())
        except ValueError: 
            pass
        
    if data.get("priority"):
        try: 
            state.ai_analysis.priority = Priority(data.get("priority").lower())
        except ValueError: 
            pass
        
    if data.get("risk_assessment"): 
        state.ai_analysis.risk_assessment = data.get("risk_assessment")
    if data.get("summary"): 
        state.ai_analysis.summary = data.get("summary")
    if data.get("recommendation"): 
        state.ai_analysis.recommended_action = data.get("recommendation")
    
    return state

def merge_state_node(state: ComplaintState) -> ComplaintState:
    """
    Finalizes the state machine status after data merging and validation.
    """
    if state.intent == IntentType.EDIT:
        state.version += 1
        
    state.last_updated = datetime.utcnow()
    return state

def missing_fields_check_node(state: ComplaintState) -> ComplaintState:
    """
    Evaluates completeness. Flags workflow to stop and ask the user if needed.
    """
    # Now perfectly safe because validation_node stripped out the AI hallucinations
    if state.validation_errors or state.ai_analysis.missing_fields:
        state.awaiting_user = True
        state.is_complete = False
        state.status = ComplaintStatus.PENDING_TRIAGE
        state.processing_notes.append("Workflow halted: Awaiting user input.")
    else:
        state.awaiting_user = False
        state.is_complete = True
        state.status = ComplaintStatus.READY_TO_COMMIT
        state.processing_notes.append("Workflow complete: Ready to Commit.")
        
    return state


# ============================
# Build Workflow
# ============================
workflow = StateGraph(ComplaintState)

# Register Nodes
workflow.add_node("input_detection", input_detection_node)
workflow.add_node("intent_detection", intent_detection_node)
workflow.add_node("extraction", extraction_node)
workflow.add_node("validation", validation_node)
workflow.add_node("risk_assessment", risk_assessment_node)
workflow.add_node("merge_state", merge_state_node)
workflow.add_node("missing_fields_check", missing_fields_check_node)

# Define Linear Flow
workflow.add_edge(START, "input_detection")
workflow.add_edge("input_detection", "intent_detection")
workflow.add_edge("intent_detection", "extraction")
workflow.add_edge("extraction", "validation")
workflow.add_edge("validation", "risk_assessment")
workflow.add_edge("risk_assessment", "merge_state")
workflow.add_edge("merge_state", "missing_fields_check")
workflow.add_edge("missing_fields_check", END)

# Compile Graph
graph = workflow.compile()