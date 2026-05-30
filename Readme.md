# Intervo

Live app: [https://intervoo.vercel.app/](https://intervoo.vercel.app/)

Intervo is an AI-powered mock interview platform built with Next.js. It helps users upload a resume, generate tailored interview questions, practice realistic video interviews, and review performance insights with AI-driven feedback.

## What It Does

- Resume-based interview question generation
- Real-time AI interview experience with video, voice, and dynamic recording timer
- Interview transcription, evaluation, and scoring endpoints
- Personalized performance insights and improvement guidance
- On-device facial expression analysis with confidence/anxiety signals per answer
- Authentication-driven dashboard, profile, signup, and login flows

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk for authentication
- MongoDB for persistence
- Groq-powered AI workflows
- Framer Motion for UI animations
- Vercel Analytics for usage tracking
- MediaPipe Tasks Vision (Face Landmarker)
- ONNX Runtime Web (emotion inference)

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Behavior Analysis Assets

Behavior analysis runs fully on-device. You need to provide the model assets in public/.

Required files:

- public/models/face_landmarker.task
- public/models/ferplus.onnx
- public/wasm/onnxruntime/*
- public/wasm/mediapipe/*

The WASM assets are copied from node_modules:

- node_modules/onnxruntime-web/dist/*.wasm, *.mjs, *.js -> public/wasm/onnxruntime/
- node_modules/@mediapipe/tasks-vision/wasm/* -> public/wasm/mediapipe/

If you swap the emotion model, update the expected input shape and label order in lib/behavior-analysis.ts.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run check
```

## Environment Variables

The app expects these environment variables:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `GROQ_API_KEY`
- `GROQ_MODEL`

## Main Routes

- `/` landing page
- `/login` sign in
- `/signup` sign up
- `/interview` interview experience
- `/dashboard` user dashboard
- `/profile` user profile
- `/features`, `/demo`, `/how-it-works`, `/insights` marketing sections

## API Routes

- `/api/resume`
- `/api/interview/questions`
- `/api/interview/transcribe`
- `/api/interview/evaluate`
- `/api/interview/scores`

## Project Structure

- `app/` Next.js app router pages and API routes
- `components/landing/` landing page sections and UI
- `components/ui/` reusable UI primitives
- `lib/` MongoDB, resume parsing, and AI helpers

## Deployment

The project is deployed on Vercel and can be accessed here:

- [https://intervoo.vercel.app/](https://intervoo.vercel.app/)
