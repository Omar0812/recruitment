# 招聘管理工具

本地运行的招聘管理工具，支持简历导入、候选人档案、岗位管理和招聘流程看板。

## 安装

```bash
cd recruitment
pip install -r requirements.txt
```

如需图片简历 OCR，还需安装 tesseract：
```bash
# macOS
brew install tesseract tesseract-lang

# Ubuntu
sudo apt install tesseract-ocr tesseract-ocr-chi-sim
```

## 配置 AI

复制配置文件并填入你的 API Key：

```bash
cp config.example.json config.json
```

编辑 `config.json`：

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "api_key": "sk-..."
}
```

支持的 provider：
- `openai` — OpenAI（GPT-4o 等）
- `anthropic` — Anthropic（Claude 等）
- `gemini` — Google Gemini
- `openai-compatible` — 通义千问、豆包等兼容 OpenAI 接口的国内模型，需额外填 `"base_url"`

## 启动

```bash
python main.py
```

浏览器会自动打开 http://localhost:8000

## 数据存储

所有数据保存在本地：
- 数据库：`data/recruitment.db`
- 简历文件：`data/resumes/`

备份只需复制 `data/` 目录即可。
