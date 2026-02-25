import json
import os
from pathlib import Path

_config = {}

def _load_config():
    global _config
    config_path = Path(__file__).parent.parent / "config.json"
    if config_path.exists():
        with open(config_path) as f:
            _config = json.load(f)

_load_config()

EXTRACT_PROMPT = """从以下简历文本中提取结构化信息，以JSON格式返回，字段如下：
- name: 中文姓名（无则null）
- name_en: 英文姓名（无则null）
- phone: 手机号
- email: 邮箱
- age: 年龄（数字，无法确定则null）
- city: 当前所在城市
- years_exp: 工作年限（数字，无法确定则null）
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

只返回JSON，不要其他文字。如果某字段无法提取，值为null或空数组。

简历文本：
{text}"""

INSIGHTS_PROMPT = """你是一个招聘助手。根据以下招聘流程数据，给出3-5条简洁可执行的建议。

数据：
{summary}

要求：
- 每条建议一句话
- 聚焦最需要关注的问题
- 用中文回答
- 只返回JSON数组，格式：["建议1", "建议2", ...]"""


def _is_configured():
    return bool(_config.get("api_key") and _config.get("api_key") != "your-api-key-here")


def parse_resume(text: str) -> dict:
    if not _is_configured():
        return {}

    prompt = EXTRACT_PROMPT.format(text=text[:8000])
    provider = _config.get("provider", "openai")

    if provider == "anthropic":
        return _call_anthropic(prompt)
    elif provider == "gemini":
        return _call_gemini(prompt)
    else:
        return _call_openai(prompt)


def generate_insights(pipeline_summary: str) -> list:
    if not _is_configured():
        return []

    prompt = INSIGHTS_PROMPT.format(summary=pipeline_summary)
    provider = _config.get("provider", "openai")

    if provider == "anthropic":
        raw = _call_anthropic_raw(prompt)
    elif provider == "gemini":
        raw = _call_gemini_raw(prompt)
    else:
        raw = _call_openai_raw(prompt)

    try:
        return json.loads(raw)
    except Exception:
        return [raw] if raw else []


def _call_openai(prompt: str) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=_config["api_key"], base_url=_config.get("base_url"))
    resp = client.chat.completions.create(
        model=_config.get("model", "gpt-4o"),
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content)


def _call_openai_raw(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=_config["api_key"], base_url=_config.get("base_url"))
    resp = client.chat.completions.create(
        model=_config.get("model", "gpt-4o"),
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content


def _call_anthropic(prompt: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(api_key=_config["api_key"])
    resp = client.messages.create(
        model=_config.get("model", "claude-sonnet-4-6"),
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end]) if start >= 0 else {}


def _call_anthropic_raw(prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=_config["api_key"])
    resp = client.messages.create(
        model=_config.get("model", "claude-sonnet-4-6"),
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text


def _call_gemini(prompt: str) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=_config["api_key"])
    model = genai.GenerativeModel(_config.get("model", "gemini-1.5-flash"))
    resp = model.generate_content(prompt)
    text = resp.text
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end]) if start >= 0 else {}


def _call_gemini_raw(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=_config["api_key"])
    model = genai.GenerativeModel(_config.get("model", "gemini-1.5-flash"))
    return model.generate_content(prompt).text
