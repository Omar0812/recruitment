from __future__ import annotations

# Unified close reason codes shown in the close panel.
CLOSE_REASON_OPTIONS = [
    {"code": "cand_other_offer", "label": "已接其他Offer", "outcome": "withdrawn"},
    {"code": "cand_salary_gap", "label": "薪资期望不一致", "outcome": "withdrawn"},
    {"code": "cand_withdraw", "label": "候选人主动放弃", "outcome": "withdrawn"},
    {"code": "cand_lost_contact", "label": "候选人失联", "outcome": "withdrawn"},
    {"code": "biz_eval_fail", "label": "面试评估不通过", "outcome": "rejected"},
    {"code": "biz_exp_mismatch", "label": "经验匹配度不足", "outcome": "rejected"},
    {"code": "biz_hc_freeze", "label": "岗位暂停/HC冻结", "outcome": "rejected"},
    {"code": "other", "label": "其他", "outcome": "rejected"},
]

CLOSE_REASON_LABELS = {item["code"]: item["label"] for item in CLOSE_REASON_OPTIONS}
