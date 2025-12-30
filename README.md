# Finance MCP Agent

An AI-powered finance application with a **FastAPI backend**, **multiple MCP servers**, and a **Next.js frontend**.  
The system routes user queries to the appropriate MCP server based on the task and returns structured responses via an agent layer.

---

## 🧩 Architecture Overview

- **Backend**: FastAPI-based agent service
- **MCP Servers**:
  - Stock data MCP server
  - Technical analysis MCP server
- **Frontend**: Next.js application for user interaction
- **Runtime**: `uv` for dependency and process management

---

## 📂 Project Structure

```
finance/
│
├── backend/
│   ├── agent.py              # FastAPI agent service
│   ├── server_stocks.py      # MCP server for stock data
│   ├── ta_mcp.py             # MCP server for technical analysis
│   └── requirements.txt
│
├── agent-frontend/
│   ├── app/                  # Next.js app router
│   ├── public/
│   ├── package.json
│   └── next.config.ts
│
└── README.md
```

---

## ⚙️ Prerequisites

- Python 3.10+
- Node.js 18+
- `uv` installed
- MCP CLI available

---

## 🐍 Backend Setup (FastAPI)

### 1️⃣ Install dependencies and export open ai key

```bash
cd backend
uv pip install -r requirements.txt

export OPENAI_API_KEY="sk-....."
```



### 2️⃣ Start the FastAPI agent server

```bash
uv run uvicorn agent:app --reload --port 8000
```

API will be available at:
```
http://localhost:8000
```

---

## 🔌 MCP Servers

### 📈 Stock MCP Server

Runs the MCP server responsible for stock-related data.

```bash
uv run mcp dev server_stocks.py
```

### 📊 Technical Analysis MCP Server

Runs a separate MCP server for technical indicators and analysis.

```bash
SERVER_PORT=6278 CLIENT_PORT=6275 uv run mcp dev ta_mcp.py
```

---

## 🌐 Frontend Setup (Next.js)

### 1️⃣ Install dependencies

```bash
cd agent-frontend
npm install
```

### 2️⃣ Run the development server

```bash
npm run dev
```

Frontend will be available at:
```
http://localhost:3000
```

---

## 🔁 How It Works

1. User interacts with the Next.js frontend
2. Requests are sent to the FastAPI agent
3. The agent decides which MCP server to invoke
4. MCP server processes the request and returns results
5. Agent formats and sends the response back to the frontend

---

## 🚀 Running Everything Together (Dev)

Open four terminals:

**Terminal 1 – Stock MCP**
```bash
uv run mcp dev server_stocks.py
```

**Terminal 2 – TA MCP**
```bash
SERVER_PORT=6278 CLIENT_PORT=6275 uv run mcp dev ta_mcp.py
```

**Terminal 3 – Backend**
```bash
uv run uvicorn agent:app --reload --port 8000
```

**Terminal 4 – Frontend**
```bash
cd agent-frontend
npm run dev
```

---

## 🛠️ Tech Stack

- FastAPI
- MCP (Model Context Protocol)
- Next.js (App Router)
- TypeScript
- uv
- Python

---

## 📌 Notes

- Each MCP server runs independently
- Ports can be configured via environment variables
- Designed to support multiple MCP tools and domains

---

## 📄 License

MIT License
