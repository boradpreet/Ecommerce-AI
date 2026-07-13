# Voqly — Per-Minute Call Cost Model

_Reference doc for the AI-calling infrastructure cost. Last researched: 2026-07-07._
_Companion interactive tool: Super Admin → **Cost Calculator** (`/superadmin/cost-calculator`)._

## TL;DR

Voqly does **not** use separate STT / TTS / LLM vendors. The entire voice pipeline is a
**single Google Gemini Live (native-audio) WebSocket session** that does speech-in →
reasoning → speech-out. Per-minute cost = **Gemini Live audio + telephony (Plivo/Twilio)**,
plus a tiny fixed post-call cost.

**All-in ≈ ₹2.0–2.2 / minute (~$0.023) for a typical outbound India call via Plivo, + ~₹0.6 fixed/call.**
~85% of the per-minute cost is Gemini audio; the agent's own speech (audio output) is the single biggest line.

## The stack (where each piece lives)

| Component | Provider | Model / Tier | File:line |
|---|---|---|---|
| STT | Google Gemini Live (native) | `gemini-3.1-flash-live-preview` (override `GEMINI_MODEL`) | `backend/app/services/gemini_live.py:11`, `backend/app/views/calling_router.py:747` |
| LLM | Google Gemini Live (same session) | `gemini-3.1-flash-live-preview`, thinking MINIMAL/0 | `backend/app/views/calling_router.py:714-757` |
| TTS | Google Gemini Live (native) | Prebuilt voices (Kore/Charon/Aoede…); default female=Kore, male=Charon | `backend/app/views/calling_router.py:718-727`, `backend/app/services/agent_call_context.py:10,931` |
| Telephony | Plivo (primary) + Twilio | PSTN, inbound + outbound | `backend/app/controllers/dialer.py:503,421`; stream XML `calling_router.py:449,582` |
| VAD / turn detection | Gemini Live built-in | `automaticActivityDetection` | `backend/app/views/calling_router.py:749-755` — **free** |
| Call recording | Plivo | `recordSession="true"`, maxLength 3600s | `backend/app/views/calling_router.py:448` |
| Post-call analysis | Google Gemini (text) | `gemini-flash-latest` (override `GEMINI_ANALYSIS_MODEL`) | `backend/app/services/transcript_analysis.py:86` |
| Embeddings / RAG | Google Gemini | `gemini-embedding-2` (3072-dim), retrieval at call setup only | `backend/app/services/embedding_service.py:11`, `rag_service.py:148` |

**Not per phone-call cost:** Groq (Whisper + Llama 3.3) is used only by the website chat
widget (`frontend/src/components/chat-support/chat-support-agent.tsx:341`). LiveKit env vars
exist but are unused in the call path. No Vapi/Retell/Pipecat/LiveKit orchestration — the
audio bridge is hand-rolled Python (`audioop` resampling + asyncio queues).

## Unit rates (current, July 2026)

### Gemini Live — `gemini-3.1-flash-live-preview` (preview pricing)
| Token type | Per 1M tokens | Per-minute equiv. | Used for |
|---|---|---|---|
| Audio input | $3.00 | **$0.005/min** | Caller speech → Gemini (STT) |
| Audio output | $12.00 | **$0.018/min** | Agent speech from Gemini (TTS) |
| Text input | $0.75 | — | System prompt (once per call) |
| Text output | $4.50 | — | Input/output transcripts we log |

Audio billed at 25 tokens/sec. Source: https://ai.google.dev/gemini-api/docs/pricing

### Telephony
| Route | Rate |
|---|---|
| Plivo — outbound/inbound India local | **₹0.60/min** (~$0.007) |
| Plivo — inbound toll-free | ₹1.30/min |
| Plivo — call recording | Free (storage $0.0004/min/mo after 90 days) |
| Twilio — outbound India mobile | $0.0075/min (~₹0.65) |
| Twilio — inbound | $0.0045/min (~₹0.39) |

Plivo bills in 60-sec increments, 60-sec minimum. Sources:
https://www.plivo.com/voice/pricing/in/ , https://www.twilio.com/en-us/voice/pricing/in

### Post-call / fixed per call
Transcript analysis (`gemini-flash-latest`) + one KB embedding ≈ **$0.002/call** — negligible.
System prompt (text input, ~6k tokens) ≈ $0.0045/call; grows with knowledge-base size.

## The formula

Per call-minute (USD), `talk` = agent talk share (0–1):

```
gemini_per_min = audio_in($0.005) + audio_out($0.018 × talk) + transcript_overhead(~$0.002)
telephony_per_min = ₹0.60 (Plivo local) | ₹1.30 (Plivo TF) | $0.0075 (Twilio mobile)
total_per_min = gemini_per_min + telephony_per_min      (convert to ₹ at FX)
per_call = total_per_min × avg_minutes + fixed_per_call(~₹0.6)
```

Gemini per-minute by agent talk share (FX ₹86/$):

| Agent talk share | Audio in | Audio out | +transcripts | Gemini/min |
|---|---|---|---|---|
| 40% | $0.0050 | $0.0072 | ~$0.002 | **$0.014 (₹1.2)** |
| 50% | $0.0050 | $0.0090 | ~$0.002 | **$0.016 (₹1.4)** |
| 60% | $0.0050 | $0.0108 | ~$0.002 | **$0.018 (₹1.5)** |

## Sample calls — outbound India via Plivo, 50% agent talk

| Length | Gemini | Plivo | Fixed/call | Total |
|---|---|---|---|---|
| 1 min | ₹1.40 | ₹0.60 | ₹0.60 | **₹2.60** (~$0.030) |
| 3 min | ₹4.20 | ₹1.80 | ₹0.60 | **₹6.60** (~$0.077) |
| 5 min | ₹7.00 | ₹3.00 | ₹0.60 | **₹10.60** (~$0.123) |

At 3-min avg: 1,000 calls ≈ ₹6,600 (~$77); 10,000 calls ≈ ₹66,000 (~$770). Plus ~$2/number/mo rental.

## What moves the number
1. **Audio output dominates** ($0.018/min). The agent is already prompted to keep replies to
   1–2 sentences (`agent_call_context.py:1543`) — that directly caps cost.
2. **Continuous audio input** — caller audio is streamed the whole call (silence-zeroing is
   commented out at `calling_router.py:915`), so you pay ~$0.005/min input even during agent speech.
3. **Model string = pricing.** Preview model; re-verify if `GEMINI_MODEL` changes or it goes GA.
4. **Large knowledge bases** inflate the per-call system-prompt cost (up to 18 RAG chunks +
   optional full SQLite dump, `calling_router.py:696-702`).
5. **Toll-free inbound** (₹1.30/min) roughly doubles the telephony line vs. local numbers.

## Re-verify checklist (prices drift)
- [ ] Gemini Live audio in/out $/min → https://ai.google.dev/gemini-api/docs/pricing
- [ ] Confirm deployed `GEMINI_MODEL` (default `gemini-3.1-flash-live-preview`)
- [ ] Plivo India voice + recording → https://www.plivo.com/voice/pricing/in/
- [ ] Twilio India voice → https://www.twilio.com/en-us/voice/pricing/in
- [ ] USD→INR FX rate (this doc assumes ₹86/$)
