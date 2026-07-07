# Future Scope & Roadmap: RAG-Powered Agentic Interviewer

This document outlines the strategic roadmap and future enhancements for the Agentic Interviewer platform, focusing on **Retrieval-Augmented Generation (RAG)**, dynamic adaptive interviews, and enterprise features.

---

## 1. Architectural Enhancements with RAG

Implementing a vector database (such as **MongoDB Atlas Vector Search** or **Pinecone**) will unlock deep contextual understanding, allowing the AI to move beyond one-off prompt contexts.

### 🌟 Company-Specific Rubrics & Culture Match (Enterprise)
* **Goal:** Evaluate candidate answers against specific corporate values or technical standards.
* **How it works:** Index official corporate assets (e.g., Amazon's Leadership Principles, Google's Engineering standards, or internal team rubrics) as vector embeddings.
* **Flow:** During the evaluation phase, retrieve relevant principles matching the question type and instruct the LLM to grade the answer relative to those strict guidelines.

### 🌟 Candidate Portfolio & Repo Deep-Dives
* **Goal:** Grill candidates on their actual code repositories, portfolios, or research papers.
* **How it works:** Let candidates upload multi-file project archives or connect their GitHub repos. The system parses and chunks all code files, READMEs, and architecture docs into a vector index.
* **Flow:** The AI interviewer queries the vector index to ask highly technical, target-specific questions: *"I see in your project X readme that you used Redis. Can you explain why you chose it over Memcached for that specific architecture?"*

### 🌟 Smart Question Bank Matching
* **Goal:** Use validated, real-world questions instead of purely synthetic AI questions.
* **How it works:** Vectorize thousands of industry-standard tech questions categorised by category, depth, and syntax.
* **Flow:** Match the candidate's target job description to index the best-fitting human-designed questions, ensuring consistent difficulty and realism.

### 🌟 Post-Interview Study Recommendations
* **Goal:** Convert mock interviews into personalized learning roadmaps.
* **How it works:** Maintain a vectorized index of tutorials, MDN documentation, system design primers, and learning paths.
* **Flow:** If the evaluator flags a weak answer (e.g., *"Candidate confused Sharding with Replication"*), query the index for corresponding educational materials and link them directly in the review dashboard.

---

## 2. Dynamic Next-Question Generation Flow

Using RAG to intelligently select follow-up questions in real-time based on current dialogue.

```
[Candidate Answers] ──> [Extract Tech Keywords] ──> [Vector Search Query] ──> [Filter & Select Next Question]
```

### Step 1: Real-time Keyword & Entity Extraction
* Analyze the transcribed answer text using a fast LLM to extract key concepts, technologies mentioned, and confidence level.

### Step 2: Adaptive Difficulty & Pivot Selection
* **Drill Down:** If the candidate speaks intelligently about a topic (e.g., *"Redis caching"*), perform a vector query on the question bank with `parentTopic: 'caching'` and `difficulty: 'hard'` to retrieve deep questions (e.g., *"How do you mitigate cache stampede?"*).
* **Mitigate Gaps:** Calculate the vector difference between the candidate's claimed resume skills and what they have demonstrated. If they claimed "Kubernetes" but haven't mentioned it, pull a Kubernetes-specific question.

---

## 3. High-Priority Engineering Upgrades

### 🎙️ Audio Streaming (WebSockets)
* Stream audio chunks progressively using WebSockets while the candidate is speaking instead of uploading a single large WebM blob on stop. 
* Enables progressive transcription (zero wait time after speaking).

### 🤖 Local Embedding Models
* Run lightweight embedding models (like HuggingFace's `all-MiniLM-L6-v2`) locally on the server to speed up vector lookups and reduce API costs.
