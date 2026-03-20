FROM python:3.11-slim

WORKDIR /app

# apt 换清华源
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources

# 安装 Node.js 18（用 Python 下载二进制，避免 curl 依赖）
RUN ARCH=$(dpkg --print-architecture) \
    && NODE_VER=v18.20.8 \
    && NODE_FILE="node-${NODE_VER}-linux-${ARCH}.tar.xz" \
    && (python3 -c "import urllib.request; urllib.request.urlretrieve('https://npmmirror.com/mirrors/node/${NODE_VER}/${NODE_FILE}', '/tmp/node.tar.xz')" \
        || python3 -c "import urllib.request; urllib.request.urlretrieve('https://nodejs.org/dist/${NODE_VER}/${NODE_FILE}', '/tmp/node.tar.xz')") \
    && apt-get update \
    && (apt-get install -y --no-install-recommends xz-utils \
        || (sed -i 's|mirrors.tuna.tsinghua.edu.cn|deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
            && apt-get update && apt-get install -y --no-install-recommends xz-utils)) \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 LiteParse CLI（淘宝源加速 + 官方源 fallback）
RUN npm install -g @llamaindex/liteparse --registry=https://registry.npmmirror.com \
    || npm install -g @llamaindex/liteparse

# 安装 Python 依赖（清华源加速）
COPY requirements.txt .
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    -r requirements.txt \
    || pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app/ app/
COPY frontend/dist/ frontend/dist/
COPY main.py .
COPY config.example.json config.example.json

# 确保 data 目录存在
RUN mkdir -p data

EXPOSE 8000

CMD ["python", "main.py"]
