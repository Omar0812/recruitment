"""Token 哈希工具。"""
import hashlib


def hash_token(token_str: str) -> str:
    """返回 token 的 SHA256 十六进制摘要。"""
    return hashlib.sha256(token_str.encode()).hexdigest()
