"""Fernet 对称加密工具 — 用于 API Key 等敏感配置的落盘加密。"""
from __future__ import annotations

import logging
import os
import stat
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_KEY_PATH = Path("data/.encrypt_key")
_fernet: Fernet | None = None


def _get_or_create_key() -> bytes:
    """读取或自动生成 Fernet 密钥文件。"""
    if _KEY_PATH.exists():
        return _KEY_PATH.read_bytes().strip()

    _KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    _KEY_PATH.write_bytes(key)
    try:
        os.chmod(_KEY_PATH, stat.S_IRUSR | stat.S_IWUSR)  # 600
    except OSError:
        pass  # Windows 等不支持 chmod 的环境
    logger.info("已自动生成加密密钥文件: %s", _KEY_PATH)
    return key


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_get_or_create_key())
    return _fernet


def encrypt_value(plaintext: str) -> str:
    """加密明文，返回 Fernet token（base64 字符串）。"""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """解密 Fernet token，返回明文。"""
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def is_encrypted(value: str) -> bool:
    """判断值是否为 Fernet 密文格式（以 gAAAAA 开头）。"""
    return bool(value) and value.startswith("gAAAAA")
