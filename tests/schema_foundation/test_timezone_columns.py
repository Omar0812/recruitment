import os
import sys
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.database import Base
from app.models.action_receipt import ActionReceipt
from app.models.application import Application
from app.models.audit_log import AuditLog
from app.models.event import Event
from app.models.expense import Expense
from app.models.legacy import Candidate, Job


@pytest.fixture(scope='module')
def db_session():
    engine = create_engine('sqlite:///:memory:')

    @event.listens_for(engine, 'connect')
    def _enable_fk(dbapi_conn, _):
        dbapi_conn.execute('PRAGMA foreign_keys=ON')

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture(scope='module')
def seed(db_session: Session):
    candidate = Candidate(name='时区测试候选人')
    job = Job(title='时区测试岗位')
    db_session.add_all([candidate, job])
    db_session.commit()
    return {'candidate_id': candidate.id, 'job_id': job.id}


def test_core_datetime_columns_are_declared_timezone_aware():
    assert Application.__table__.c.created_at.type.timezone is True
    assert Application.__table__.c.updated_at.type.timezone is True
    assert Event.__table__.c.occurred_at.type.timezone is True
    assert Expense.__table__.c.occurred_at.type.timezone is True
    assert ActionReceipt.__table__.c.created_at.type.timezone is True
    assert AuditLog.__table__.c.created_at.type.timezone is True


def test_core_defaults_keep_utc_aware_timestamps(db_session: Session, seed):
    application = Application(
        candidate_id=seed['candidate_id'],
        job_id=seed['job_id'],
        state='IN_PROGRESS',
    )
    receipt = ActionReceipt(
        command_id='timezone-test-command',
        action_code='noop',
        target_type='candidate',
        target_id=seed['candidate_id'],
        ok=True,
    )
    audit = AuditLog(
        actor_type='human',
        action_code='noop',
        target_type='candidate',
        target_id=seed['candidate_id'],
        details={'source': 'test'},
    )

    db_session.add_all([application, receipt, audit])
    db_session.flush()

    assert application.created_at.tzinfo is not None
    assert application.updated_at.tzinfo is not None
    assert receipt.created_at.tzinfo is not None
    assert audit.created_at.tzinfo is not None
    assert application.created_at.utcoffset() == timezone.utc.utcoffset(application.created_at)
    assert application.updated_at.utcoffset() == timezone.utc.utcoffset(application.updated_at)
    assert receipt.created_at.utcoffset() == timezone.utc.utcoffset(receipt.created_at)
    assert audit.created_at.utcoffset() == timezone.utc.utcoffset(audit.created_at)
