import json
import logging

logger = logging.getLogger(__name__)

_config: dict = {}
_config_loaded = False

# DB key → config key 映射
_DB_KEY_MAP = {
    "ai_provider": "provider",
    "ai_model": "model",
    "ai_api_key": "api_key",
    "ai_base_url": "base_url",
}


def _load_config():
    """从 system_settings 表读取 AI 配置，缓存到内存。"""
    global _config, _config_loaded
    if _config_loaded:
        return

    try:
        from app.database import SessionLocal
        from app.models.system_setting import SystemSetting

        db = SessionLocal()
        try:
            rows = db.query(SystemSetting).filter(
                SystemSetting.key.in_(_DB_KEY_MAP.keys())
            ).all()
            _config = {}
            for row in rows:
                mapped_key = _DB_KEY_MAP.get(row.key)
                if mapped_key and row.value:
                    _config[mapped_key] = row.value
        finally:
            db.close()
    except Exception:
        _config = {}

    _config_loaded = True


def clear_config_cache():
    """admin 更新设置后调用，清除内存缓存，下次使用时重新从 DB 读取。"""
    global _config, _config_loaded
    _config = {}
    _config_loaded = False


def _get_config() -> dict:
    """获取配置（懒加载）。"""
    if not _config_loaded:
        _load_config()
    return _config

_FIELD_SCHEMA = """以JSON格式返回，字段如下：
- name: 中文姓名（无则null）
- name_en: 英文姓名（无则null）
- phone: 手机号
- email: 邮箱
- age: 年龄（数字，无法确定则null）
- city: 当前所在城市
- years_exp: 工作年限（精确到0.5年的数字，如4.5、3.0，无法确定则null）
- skill_tags: 技能标签列表（字符串数组，最多8个）
- education_list: 所有教育经历数组，每条包含：
  - degree: 学历（如本科、硕士、博士）
  - school: 院校名称
  - major: 专业（无则null）
  - period: 时间段（如2015-2019，无则null）
- work_experience: 所有工作经历数组（从最近到最早），每条包含：
  - company: 公司名称
  - title: 职位名称
  - period: 时间段（如2019-至今，无则null）
  - description: 该段工作的职责与结果（尽量结构化成一句到三句）
- project_experience: 项目经历数组（从最近到最早），每条包含：
  - name: 项目名称
  - role: 担任角色（无则null）
  - period: 时间段（如2023.03-2024.01，无则null）
  - description: 项目职责与产出（核心内容）

只返回JSON，不要其他文字。如果某字段无法提取，值为null或空数组。
保证返回的是严格合法 JSON：字符串内的双引号要转义，不要输出注释、Markdown 代码块或额外解释。"""

VISION_SYSTEM_PROMPT = f"你是一个简历解析助手。用户会发送简历图片，请从图片中提取结构化信息。\n\n{_FIELD_SCHEMA}"

TEXT_SYSTEM_PROMPT = f"你是一个简历解析助手。用户会发送简历文本，请从文本中提取结构化信息。\n\n{_FIELD_SCHEMA}"

INSIGHTS_PROMPT = """你是一个招聘助手。根据以下招聘流程数据，给出3-5条简洁可执行的建议。

数据：
{summary}

要求：
- 每条建议一句话
- 聚焦最需要关注的问题
- 用中文回答
- 只返回JSON数组，格式：["建议1", "建议2", ...]"""


def _is_configured():
    cfg = _get_config()
    return bool(cfg.get("api_key") and cfg.get("api_key") != "your-api-key-here")


def _strip_code_fence(text: str) -> str:
    s = (text or "").strip()
    if not s.startswith("```"):
        return s
    chunks = s.split("```")
    for chunk in chunks:
        candidate = chunk.strip()
        if not candidate:
            continue
        if candidate.lower().startswith("json"):
            candidate = candidate[4:].lstrip()
        if candidate.startswith("{") and candidate.endswith("}"):
            return candidate
        if candidate.startswith("[") and candidate.endswith("]"):
            return candidate
    return s


def _slice_first_json_object(text: str) -> str:
    s = text or ""
    start = s.find("{")
    if start < 0:
        return ""
    in_string = False
    escaped = False
    depth = 0
    for i in range(start, len(s)):
        ch = s[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return s[start:] if start >= 0 else ""


def _repair_common_json_issues(text: str) -> str:
    # Best-effort fix for openai-compatible providers that occasionally return
    # near-JSON with raw newlines or unescaped quotes in string values.
    src = (text or "").strip().lstrip("\ufeff")
    if not src:
        return src
    out = []
    in_string = False
    escaped = False
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if in_string:
            if escaped:
                out.append(ch)
                escaped = False
            elif ch == "\\":
                out.append(ch)
                escaped = True
            elif ch == '"':
                j = i + 1
                while j < n and src[j] in " \t\r\n":
                    j += 1
                if j >= n or src[j] in ",}]:":
                    out.append(ch)
                    in_string = False
                else:
                    out.append('\\"')
            elif ch == "\n":
                out.append("\\n")
            elif ch == "\r":
                out.append("\\r")
            elif ch == "\t":
                out.append("\\t")
            else:
                out.append(ch)
        else:
            if ch == '"':
                in_string = True
            out.append(ch)
        i += 1
    if in_string:
        out.append('"')
    return "".join(out)


def _load_json_loose(raw: str):
    text = (raw or "").strip().lstrip("\ufeff")
    if not text:
        raise ValueError("empty ai response")

    candidates = []
    for candidate in (
        text,
        _strip_code_fence(text),
        _slice_first_json_object(_strip_code_fence(text)),
    ):
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    last_err = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except Exception as e:
            last_err = e

    repaired = _repair_common_json_issues(candidates[-1])
    if repaired and repaired not in candidates:
        try:
            return json.loads(repaired)
        except Exception as e:
            last_err = e

    if last_err:
        raise last_err
    raise ValueError("invalid ai response")


def parse_resume(content: dict) -> dict:
    """接收 extract_content 的输出，按 type 选择 vision/text 路径调用 AI。

    返回结构化候选人信息，或 { error, error_type }。
    """
    if not _is_configured():
        return {"error": "AI 未配置，请在系统设置中配置", "error_type": "not_configured"}

    cfg = _get_config()
    provider = cfg.get("provider", "openai")
    content_type = content.get("type")

    try:
        if content_type == "images":
            raw = _call_vision(provider, cfg, content["content"])
        elif content_type == "text":
            raw = _call_text(provider, cfg, content["content"])
        else:
            return {"error": "未知的内容类型", "error_type": "extract_failed"}
    except Exception as e:
        logger.exception("AI 调用失败")
        return {"error": str(e), "error_type": "ai_failed"}

    try:
        parsed = _load_json_loose(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"error": "AI 返回非对象结构", "error_type": "parse_failed"}
    except Exception as e:
        logger.exception("AI 返回 JSON 解析失败")
        return {"error": str(e), "error_type": "parse_failed"}


def _call_vision(provider: str, cfg: dict, images: list[str]) -> str:
    """按 provider 调用 vision API，返回原始文本。"""
    if provider == "anthropic":
        return _call_anthropic_vision(cfg, images)
    elif provider == "gemini":
        return _call_gemini_vision(cfg, images)
    else:
        return _call_openai_vision(cfg, images)


def _call_text(provider: str, cfg: dict, text: str) -> str:
    """按 provider 调用 text API，返回原始文本。"""
    if provider == "anthropic":
        return _call_anthropic_text(cfg, text)
    elif provider == "gemini":
        return _call_gemini_text(cfg, text)
    else:
        return _call_openai_text(cfg, text)


def _call_openai_vision(cfg: dict, images: list[str]) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=cfg["api_key"], base_url=cfg.get("base_url"))
    model = cfg.get("model", "gpt-4o")

    image_parts = [
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img}"}}
        for img in images
    ]
    user_content = [{"type": "text", "text": "请解析这份简历。"}] + image_parts

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
    except Exception:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": VISION_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
    return resp.choices[0].message.content


def _call_openai_text(cfg: dict, text: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=cfg["api_key"], base_url=cfg.get("base_url"))
    model = cfg.get("model", "gpt-4o")

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": TEXT_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
        )
    except Exception:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": TEXT_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
        )
    return resp.choices[0].message.content


def _call_anthropic_vision(cfg: dict, images: list[str]) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=cfg["api_key"])
    model = cfg.get("model", "claude-sonnet-4-6")

    image_blocks = [
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": img}}
        for img in images
    ]
    user_content = image_blocks + [{"type": "text", "text": "请解析这份简历。"}]

    resp = client.messages.create(
        model=model,
        max_tokens=4096,
        system=VISION_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )
    return resp.content[0].text


def _call_anthropic_text(cfg: dict, text: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=cfg["api_key"])
    model = cfg.get("model", "claude-sonnet-4-6")

    resp = client.messages.create(
        model=model,
        max_tokens=4096,
        system=TEXT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": text}],
    )
    return resp.content[0].text


def _call_gemini_vision(cfg: dict, images: list[str]) -> str:
    import base64
    import google.generativeai as genai
    genai.configure(api_key=cfg["api_key"])
    model = genai.GenerativeModel(
        cfg.get("model", "gemini-1.5-flash"),
        system_instruction=VISION_SYSTEM_PROMPT,
    )

    parts = []
    for img in images:
        parts.append({"inline_data": {"mime_type": "image/png", "data": img}})
    parts.append("请解析这份简历。")

    resp = model.generate_content(parts)
    return resp.text


def _call_gemini_text(cfg: dict, text: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=cfg["api_key"])
    model = genai.GenerativeModel(
        cfg.get("model", "gemini-1.5-flash"),
        system_instruction=TEXT_SYSTEM_PROMPT,
    )

    resp = model.generate_content(text)
    return resp.text


def generate_insights(pipeline_summary: str) -> list:
    if not _is_configured():
        return []

    prompt = INSIGHTS_PROMPT.format(summary=pipeline_summary)
    cfg = _get_config()
    provider = cfg.get("provider", "openai")

    if provider == "anthropic":
        raw = _call_anthropic_raw(prompt)
    elif provider == "gemini":
        raw = _call_gemini_raw(prompt)
    else:
        raw = _call_openai_raw(prompt)

    try:
        parsed = _load_json_loose(raw)
        return parsed if isinstance(parsed, list) else [raw]
    except Exception:
        return [raw] if raw else []



def _call_openai_raw(prompt: str) -> str:
    from openai import OpenAI
    cfg = _get_config()
    client = OpenAI(api_key=cfg["api_key"], base_url=cfg.get("base_url"))
    resp = client.chat.completions.create(
        model=cfg.get("model", "gpt-4o"),
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content



def _call_anthropic_raw(prompt: str) -> str:
    import anthropic
    cfg = _get_config()
    client = anthropic.Anthropic(api_key=cfg["api_key"])
    resp = client.messages.create(
        model=cfg.get("model", "claude-sonnet-4-6"),
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text



def _call_gemini_raw(prompt: str) -> str:
    import google.generativeai as genai
    cfg = _get_config()
    genai.configure(api_key=cfg["api_key"])
    model = genai.GenerativeModel(cfg.get("model", "gemini-1.5-flash"))
    return model.generate_content(prompt).text


async def test_connection() -> dict:
    """用已保存的 AI 配置发最简请求验证连通性。10 秒超时。"""
    cfg = _get_config()
    if not cfg.get("api_key") or cfg.get("api_key") == "your-api-key-here":
        return {"ok": False, "error": "未配置 API Key"}

    provider = cfg.get("provider", "openai")
    model_name = cfg.get("model", "")

    import asyncio

    def _do_test() -> dict:
        try:
            if provider == "anthropic":
                import anthropic
                client = anthropic.Anthropic(api_key=cfg["api_key"], timeout=10.0)
                resp = client.messages.create(
                    model=model_name or "claude-sonnet-4-6",
                    max_tokens=16,
                    messages=[{"role": "user", "content": "hi"}],
                )
                return {"ok": True, "model": resp.model}
            elif provider == "gemini":
                import google.generativeai as genai
                genai.configure(api_key=cfg["api_key"])
                m = genai.GenerativeModel(model_name or "gemini-1.5-flash")
                m.generate_content("hi", request_options={"timeout": 10})
                return {"ok": True, "model": model_name or "gemini-1.5-flash"}
            else:
                from openai import OpenAI
                client = OpenAI(
                    api_key=cfg["api_key"],
                    base_url=cfg.get("base_url") or None,
                    timeout=10.0,
                )
                resp = client.chat.completions.create(
                    model=model_name or "gpt-4o",
                    max_tokens=16,
                    messages=[{"role": "user", "content": "hi"}],
                )
                return {"ok": True, "model": resp.model}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    return await asyncio.to_thread(_do_test)
