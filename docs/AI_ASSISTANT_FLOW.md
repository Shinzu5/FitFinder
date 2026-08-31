# FitFinder — AI Assistant Flow

## Question → Domain Gate → Gemini → Response

> Implementation note for defense: FitFinder uses a **fitness-domain keyword gate** (pre-filter) before calling **Google Gemini**. There is no separate vector database / embedding RAG index in this codebase. The gate + system instruction constrain answers to fitness topics (functionally the “retrieve/restrict context” step before generation).

```
[Gymer AI page]
    │  UserAiAssistantPanel + user-ai-store
    │  membership must be unlocked (dashboard gate)
    ▼
POST /api/user/ai-chat  { message }
    │  user.controller.aiChat
    ▼
generateAiResponse(message)  ← ai.service.ts
    │
    ├─ 1) Empty check
    │
    ├─ 2) Domain gate (FITNESS_KEYWORDS)
    │     if off-topic → polite refusal string (no Gemini call)
    │
    ├─ 3) Gemini (GoogleGenerativeAI)
    │     model: env.GEMINI_MODEL
    │     systemInstruction: FitFinder fitness assistant prompt
    │     temperature / max tokens from env
    │
    └─ 4) Return response.text()
    ▼
user-ai-store appends assistant reply to local conversation
    │
    ▼
UI renders answer (client-side history only; not persisted in Neon)
```

## Key files

| Layer | Path |
|-------|------|
| Page | `Frontend/src/app/dashboard/user/ai/page.tsx` |
| UI | `Frontend/src/app/dashboard/user/_components/UserAiAssistantPanel.tsx` |
| Store | `Frontend/src/stores/user-ai-store.ts` |
| Route | `POST /api/user/ai-chat` in `user.routes.ts` |
| Controller | `user.controller.ts` → `aiChat` |
| Service | `Backend/src/services/ai.service.ts` |
| Config | `Backend/src/config/env.ts` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_*`) |

## Database

- None for chat transcripts (kept in Zustand while the session is open)

## Socket

- None (request/response over REST)

## Env required

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_TEMPERATURE`, `AI_MAX_TOKENS` (optional tuning)
