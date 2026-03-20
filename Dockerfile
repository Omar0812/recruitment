FROM python:3.11-slim

WORKDIR /app

# apt 源：先试官方，失败换清华
RUN apt-get update || \
    (sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources && apt-get update)

# 安装 Node.js 18
RUN apt-get install -y --no-install-recommends xz-utils curl ca-certificates \
    && ARCH=$(dpkg --print-architecture) \
    && NODE_VER=v18.20.8 \
    && NODE_FILE="node-${NODE_VER}-linux-${ARCH}.tar.xz" \
    && (curl -fsSL "https://nodejs.org/dist/${NODE_VER}/${NODE_FILE}" -o /tmp/node.tar.xz \
        || curl -fsSL "https://npmmirror.com/mirrors/node/${NODE_VER}/${NODE_FILE}" -o /tmp/node.tar.xz) \
    && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
    && rm /tmp/node.tar.xz \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 LiteParse CLI（官方源优先，淘宝源 fallback）
RUN npm install -g @llamaindex/liteparse \
    || npm install -g @llamaindex/liteparse --registry=https://registry.npmmirror.com

# 安装 Python 依赖（官方源优先，清华源 fallback）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    || pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

# 复制应用代码
COPY app/ app/
COPY frontend/dist/ frontend/dist/
COPY main.py .
COPY config.example.json config.example.json

# 确保 data 目录存在
RUN mkdir -p data

EXPOSE 8000

CMD ["python", "main.py"]
