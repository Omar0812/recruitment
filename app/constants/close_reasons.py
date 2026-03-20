from __future__ import annotations

from typing import Optional

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
CLOSE_REASON_OUTCOMES = {item["code"]: item["outcome"] for item in CLOSE_REASON_OPTIONS}
VALID_CLOSE_REASON_CODES = set(CLOSE_REASON_LABELS.keys())

LEGACY_REASON_TO_CODE = {
    # candidate-side / withdrawn
    "已接其他Offer": "cand_other_offer",
    "接受其他 Offer": "cand_other_offer",
    "接受了其他Offer": "cand_other_offer",
    "候选人拒绝Offer": "cand_other_offer",
    "薪资谈不拢": "cand_salary_gap",
    "薪资未达预期": "cand_salary_gap",
    "薪资期望差距过大": "cand_salary_gap",
    "候选人主动放弃": "cand_withdraw",
    "个人原因": "cand_withdraw",
    "岗位职责不符合预期": "cand_withdraw",
    "地点/出行问题": "cand_withdraw",
    "候选人失联": "cand_lost_contact",
    # company-side / rejected
    "面试评估不通过": "biz_eval_fail",
    "技术能力不达标": "biz_eval_fail",
    "综合素质不匹配": "biz_eval_fail",
    "背调有问题": "biz_eval_fail",
    "经验匹配": "biz_exp_mismatch",
    "经验不匹配": "biz_exp_mismatch",
    "经验年限不足": "biz_exp_mismatch",
    "文化/价值观不符": "biz_exp_mismatch",
    "岗位关闭": "biz_hc_freeze",
    "岗位暂停": "biz_hc_freeze",
    "岗位暂停/HC冻结": "biz_hc_freeze",
    "job_closed": "biz_hc_freeze",
}


def normalize_close_reason_code(code: Optional[str], legacy_reason: Optional[str] = None) -> Optional[str]:
    if code and code in VALID_CLOSE_REASON_CODES:
        return code
    legacy = (legacy_reason or "").strip()
    if not legacy:
        return None
    return LEGACY_REASON_TO_CODE.get(legacy, "other")


def label_for_close_reason(code: Optional[str], fallback_reason: Optional[str] = None) -> Optional[str]:
    if code and code in CLOSE_REASON_LABELS:
        if code == "other":
            return fallback_reason or CLOSE_REASON_LABELS[code]
        return CLOSE_REASON_LABELS[code]
    if fallback_reason:
        return fallback_reason
    return None


def default_outcome_for_reason(code: Optional[str]) -> str:
    if code and code in CLOSE_REASON_OUTCOMES:
        return CLOSE_REASON_OUTCOMES[code]
    return "rejected"
