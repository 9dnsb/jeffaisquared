# 🧠 Text-to-SQL RAG Overview for Next.js + Supabase + Prisma

This guide outlines how to implement a **Text-to-SQL Retrieval-Augmented Generation (RAG)** system for a **Next.js web app** that uses **Supabase (with pgvector)** and optionally **Prisma ORM**.

---

## 🧩 Architecture Overview

| Step | Component | Description |
|------|------------|-------------|
| 1️⃣ | **Supabase** | Stores your database schema and embeddings (`pgvector`). |
| 2️⃣ | **API Route** | Handles embedding → retrieval → SQL generation → execution. |
| 3️⃣ | **LLM Streaming** | Streams partial results (SQL + execution) to the frontend. |
| 4️⃣ | **Chat UI** | Displays live query generation and results. |

---

## ⚙️ Base Flow (Supabase + Raw SQL)

### 1. Store Schema Embeddings

Create a table to hold schema info and vector embeddings:

```sql
create extension if not exists vector;

create table if not exists schema_embeddings (
  id bigserial primary key,
  object_name text,
  object_type text,
  description text,
  embedding vector(1536)
);
```

Define a retrieval function:

```sql
create or replace function match_schema (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  object_name text,
  object_type text,
  description text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    id,
    object_name,
    object_type,
    description,
    1 - (embedding <-> query_embedding) as similarity
  from schema_embeddings
  where 1 - (embedding <-> query_embedding) > match_threshold
  order by embedding <-> query_embedding
  limit match_count;
end;
$$;
```

Safe query execution function:

```sql
create or replace function exec_sql_query(sql_query text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  if position('select' in lower(sql_query)) != 1 then
    raise exception 'Only SELECT queries are allowed';
  end if;

  execute format('select json_agg(t) from (%s) as t', sql_query)
  into result;

  return coalesce(result, '[]'::json);
end;
$$;
```

---

## 🧱 API Route: `/app/api/text-to-sql/route.ts`

Implements streaming RAG flow using OpenAI + Supabase.

Key steps:
- Embed question
- Retrieve schema context
- Generate SQL via LLM
- Execute and stream results

---

## 💬 Frontend Chat UI

React component streams SSE messages from the API route and updates UI live.

---

## ⚙️ Alternative: Prisma ORM Integration

You can replace SQL execution with **Prisma client queries** if you prefer.

### Option 1: SQL (Default)
- Use Supabase RPC or `pg` client to execute raw SQL.
- Best for unstructured data exploration.

### Option 2: Prisma Code Generation
- LLM outputs Prisma syntax (e.g. `prisma.user.findMany(...)`).
- You run it in a sandbox with safe validation.
- Good for structured, limited queries.

### Option 3: Hybrid (Recommended)
- Use Prisma for your main app.
- Use direct SQL (Supabase) for your AI chat endpoint.
- Safe, flexible, and keeps ORM benefits.

---

## 🧭 Summary

| Approach | What the LLM outputs | Executes how | Best for |
|-----------|---------------------|---------------|-----------|
| **SQL** | Raw SQL | Supabase RPC or PG client | Freeform analytics, RAG |
| **Prisma code** | Prisma client syntax | Sandbox executor | Structured queries |
| **Hybrid** | Both | ORM for CRUD, SQL for AI | Production apps |

---

## 🔒 Security & Best Practices

- Use **read-only DB roles** for the AI route.
- Restrict RPC to `SELECT` only.
- Sanitize or log LLM-generated queries.
- Never `eval()` untrusted Prisma code; use controlled parsing.

---

## 🚀 Next Steps

1. Implement `/api/text-to-sql` with streaming SSE.
2. Embed your database schema into `schema_embeddings`.
3. Deploy Supabase with pgvector enabled.
4. Add frontend streaming chat to test queries.
5. (Optional) Layer Prisma for your normal app logic.

---

## ✅ Output Example

```
🧠 Embedding question...
🔍 Retrieving schema context...
🧩 Generating SQL...
SELECT ... FROM ... WHERE ...
🚀 Executing query...
📊 Results: [ { "name": "Alice", "total_spent": 12000 }, ... ]
```

---

## 🧰 Tooling Stack

- **Next.js (App Router)** — API routes & frontend
- **Supabase** — Postgres + pgvector + RPC
- **OpenAI** — Embeddings + GPT-4o-mini / GPT-4-turbo
- **Prisma (Optional)** — ORM abstraction for app logic

---

## 🧠 Author’s Note

This architecture lets you build a production-grade AI chat that understands your data and can generate and execute SQL safely — while maintaining flexibility for Prisma ORM–based apps.

