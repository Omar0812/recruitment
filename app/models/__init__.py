# Shared base entities
from app.models.legacy import (  # noqa: F401
    Candidate,
    Supplier,
    Job,
)

# New models (新系统)
from app.models.application import Application  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.term import Term  # noqa: F401
from app.models.expense import Expense  # noqa: F401
from app.models.action_receipt import ActionReceipt  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.token import Token  # noqa: F401
from app.models.system_setting import SystemSetting  # noqa: F401

# Enums
from app.models.enums import (  # noqa: F401
    ApplicationState,
    Outcome,
    EventType,
    ActorType,
    TermType,
)
