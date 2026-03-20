"""乐观锁 version 比对工具。"""
from __future__ import annotations

from fastapi import HTTPException


def check_version(entity, client_version: int | None) -> None:
    """比对客户端传入的 version 与数据库实体的 version。

    不一致时返回 409；client_version 为 None 时返回 422。
    """
    if client_version is None:
        raise HTTPException(
            status_code=422,
            detail="缺少 version 字段",
        )
    if entity.version != client_version:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "VERSION_CONFLICT",
                "message": "该记录刚被修改过，请刷新",
            },
        )


def bump_version(entity) -> None:
    """写操作成功后递增 version。"""
    entity.version = (entity.version or 1) + 1
