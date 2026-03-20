from __future__ import annotations


class BusinessError(Exception):
    """engine 层统一业务异常。

    code  — 机器可读标识，如 "application_not_active"
    message — 人可读描述，如 "流程已结束，无法推进"
    """

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)
