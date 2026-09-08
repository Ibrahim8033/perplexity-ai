# Perplexity AI

A full-stack AI-powered search assistant inspired by Perplexity. The application combines real-time web search, large language models, streaming responses, source citations, authentication, and persistent conversation history into a clean and responsive interface.

## 🚀 Live Demo

**Frontend:** https://perplexity-ai-oauv.vercel.app/

---

## ✨ Features

* 🔎 **AI-powered web search** using Tavily
* 🤖 **Google Gemini integration** for AI-generated answers
* ⚡ **Streaming AI responses** for a real-time experience
* 📚 **Source citations** with clickable web sources
* 🔐 **Google & GitHub authentication** using Supabase
* 💬 **Conversation history** for authenticated users
* 🗑️ **Delete conversations**
* 🔄 **Follow-up question suggestions**
* 📝 **Markdown-rendered AI responses**
* 📱 **Responsive UI** for desktop and mobile
* 🛡️ **Authenticated API endpoints**
* 💾 **PostgreSQL database** with Prisma ORM
* 🔁 **AI fallback system** using Vercel AI Gateway
* 🌐 **Web-search fallback** when AI models are unavailable

---

## 🏗️ Architecture

The project is divided into two main applications:

```text
perplexity-ai/
│
├── Frontend/
│   ├── React
│   ├── TypeScript
│   ├── Tailwind CSS
│   ├── React Router
│   ├── Supabase Auth
│   └── Lucide React
│
└── Backend/
    ├── Express.js
    ├── TypeScript
    ├── Google Gemini
    ├── Tavily Search
    ├── Prisma ORM
    ├── PostgreSQL
    └── Supabase Authentication
```

### Request Flow

```text
User
  │
  ▼
React Frontend
  │
  │ Authenticated Request
  ▼
Express Backend
  │
  ├──────────────► Supabase Authentication
  │
  ├──────────────► Tavily Web Search
  │                       │
  │                       ▼
  │                 Search Results
  │
  ▼
Google Gemini
  │
  ▼
Streaming AI Response
  │
  ├──────────────► Sources
  │
  └──────────────► Conversation Database
  │
  ▼
React UI
```

---

## 🛠️ Tech Stack

### Frontend

* **React 19**
* **TypeScript**
* **Tailwind CSS**
* **React Router**
* **Supabase**
* **Lucide React**
* **Bun**

### Backend

* **Node.js / Bun**
* **Express.js**
* **TypeScript**
* **Vercel AI SDK**
* **Google Gemini**
* **Tavily**
* **Prisma ORM**
* **PostgreSQL**
* **Supabase**

### Deployment

* **Vercel** — Frontend
* **Render** — Backend
* **Supabase** — Authentication
* **PostgreSQL** — Database

---

## 🔑 Authentication

Authentication is handled through Supabase OAuth.

Currently supported providers:

* Google
* GitHub

After successful authentication, the Supabase session is used to authorize requests to the backend.

The frontend sends the access token through the `Authorization` header:

```text
Authorization: <access_token>
```

The backend middleware validates the authenticated user before allowing access to protected resources.

---

## 🔎 AI Search Pipeline

When a user submits a question, the following process takes place:

### 1. User submits a query

The React frontend sends the query to:

```http
POST /purplexity_ask
```

### 2. Authentication

The backend verifies the user's Supabase session.

### 3. Web Search

The query is sent to Tavily using advanced search:

```text
Tavily → Web Search Results
```

The returned results contain:

* Title
* URL
* Relevant content

### 4. Context Engineering

The search results are formatted and injected into the AI prompt together with the user's question.

### 5. AI Generation

Google Gemini generates the answer using the retrieved web context.

### 6. Streaming

The response is streamed directly to the frontend rather than waiting for the complete answer.

### 7. Sources

The backend sends the sources separately so the frontend can display clickable source cards.

### 8. Persistence

The query and generated answer are stored in PostgreSQL.

---

## 🤖 AI Fallback Strategy

The backend implements multiple fallback levels to improve reliability.

```text
Google Gemini
     │
     │ Failure
     ▼
Vercel AI Gateway
     │
     │ Failure
     ▼
Tavily Search Results
     │
     ▼
Fallback Answer
```

This means the application can still provide useful information even when the primary AI provider temporarily fails.

---

## 📚 Conversation History

Authenticated users can access their previous conversations from the sidebar.

Each conversation contains:

```text
Conversation
├── ID
├── Title
├── Slug
├── User
└── Messages
      ├── USER
      └── ASSISTANT
```

Users can:

* View previous conversations
* Open a conversation using its slug
* Start a new thread
* Delete conversations

---

## 🗄️ Database Schema

The application uses PostgreSQL with Prisma.

### User

```text
User
├── id
├── email
├── provider
├── name
├── supabaseId
└── conversations
```

### Conversation

```text
Conversation
├── id
├── title
├── slug
├── userId
└── messages
```

### Message

```text
Message
├── id
├── content
├── role
├── conversationId
└── createdAt
```

---

## 🔌 API Endpoints

### Health Check

```http
GET /health
```

Used to verify that the backend server is running.

---

### Ask AI

```http
POST /purplexity_ask
```

**Request:**

```json
{
  "query": "What is quantum computing?"
}
```

Returns a streamed AI response along with web sources and conversation metadata.

**Authentication:** Required

---

### Get Conversations

```http
GET /conversations
```

Returns the authenticated user's conversation history.

**Authentication:** Required

---

### Get Conversation

```http
GET /conversation/:slug
```

Fetches a specific conversation and its messages.

**Authentication:** Required

---

### Delete Conversation

```http
DELETE /conversation/:id
```

Deletes a conversation and its associated messages.

**Authentication:** Required

---

## ⚙️ Environment Variables

Create a `.env` file in the `Backend` directory:

```env
TAVILY_API_KEY=your_tavily_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
DATABASE_URL=your_postgresql_connection_string
FRONTEND_URL=http://localhost:3000
```

For the frontend, create a `.env` file with your Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Never commit real API keys, database credentials, or Supabase secrets to GitHub.

---

## 💻 Local Development

### Prerequisites

Make sure you have:

* Bun
* PostgreSQL
* Supabase project
* Tavily API key
* Google AI API key

---

### 1. Clone the repository

```bash
git clone https://github.com/Ibrahim8033/perplexity-ai.git

cd perplexity-ai
```

---

### 2. Start the Backend

```bash
cd Backend

bun install
```

Configure your environment variables:

```bash
cp .env.example .env
```

Generate Prisma Client:

```bash
bun run build
```

Start the backend:

```bash
bun run dev
```

The backend will run on:

```text
http://localhost:8000
```

---

### 3. Start the Frontend

Open another terminal:

```bash
cd Frontend

bun install
```

Configure the frontend environment variables and start the development server:

```bash
bun run dev
```

The frontend will be available at the development URL shown by Bun.

---

## 📁 Project Structure

```text
perplexity-ai/
│
├── Backend/
│   ├── api/
│   │   └── index.ts
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── client.ts
│   ├── db.ts
│   ├── index.ts
│   ├── middleware.ts
│   ├── promt.ts
│   ├── package.json
│   └── vercel.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── index.css
│   │
│   ├── package.json
│   └── build.ts
│
└── README.md
```

---

## 🎨 UI

The application follows a minimal dark-themed interface inspired by modern AI search products.

Main UI components include:

* Search interface
* AI answer display
* Source cards
* Follow-up questions
* Conversation sidebar
* Authentication screen
* Loading skeletons
* Responsive mobile navigation

---

## 🔮 Future Improvements

Some possible improvements for future versions:

* [ ] Fully implement conversational follow-up API
* [ ] Add conversation renaming
* [ ] Add search focus modes
* [ ] Add voice search
* [ ] Add file/document upload
* [ ] Add image search
* [ ] Add advanced source previews
* [ ] Add conversation sharing
* [ ] Add user settings
* [ ] Add AI model selection
* [ ] Improve citation generation
* [ ] Add rate limiting and request monitoring

---

## 📌 Key Highlights

This project demonstrates practical implementation of:

* Full-stack TypeScript development
* React-based frontend architecture
* REST API development with Express
* OAuth authentication
* LLM integration
* Retrieval-Augmented Generation (RAG-style) workflow
* Real-time response streaming
* Web search integration
* Database modeling with Prisma
* PostgreSQL persistence
* API authentication and authorization
* Cloud deployment

---

## 👨‍💻 Author

**Ibrahim Khan**

GitHub: https://github.com/Ibrahim8033

---

## ⭐ Support

If you found this project interesting, consider giving the repository a ⭐ on GitHub.
