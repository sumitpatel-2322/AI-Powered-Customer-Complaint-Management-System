from enum import Enum


class ComplaintStatus(str, Enum):
    """Current lifecycle state of a complaint."""

    PENDING_TRIAGE = "Pending Triage"
    READY_TO_COMMIT = "Ready to Commit"
    COMMITTED = "Committed"
    INVESTIGATION = "Investigation"
    CAPA = "CAPA"
    CLOSED = "Closed"


class ComplaintSource(str, Enum):
    """Source from which the complaint was received."""

    CHAT = "chat"
    PDF = "pdf"
    EMAIL = "email"
    IMAGE = "image"


class IntentType(str, Enum):
    """Intent detected from the user's message."""

    CREATE = "create"
    EDIT = "edit"
    QUERY = "query"


class Severity(str, Enum):
    """AI-assigned complaint severity."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Priority(str, Enum):
    """Operational priority assigned to the complaint."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class MessageRole(str, Enum):
    """Role of a chat message."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class DocumentType(str, Enum):
    """Supported document types."""

    PDF = "pdf"
    IMAGE = "image"
    EMAIL = "email"
    TEXT = "text"