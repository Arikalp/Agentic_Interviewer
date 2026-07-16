import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { ResumeChunk } from '@/models/ResumeChunk';
import type { ConversationMemory } from '@/models/ConversationMemory';
import type { InterviewState } from '@/models/InterviewState';

import { retrieveResume } from '@/langgraph/nodes/retrieveResume';
import { retrieveConversation } from '@/langgraph/nodes/retrieveConversation';
import { fetchRecentMemory } from '@/langgraph/nodes/fetchRecentMemory';
import { planner } from '@/langgraph/nodes/planner';
import { questionGenerator } from '@/langgraph/nodes/questionGenerator';
import { saveMemory } from '@/langgraph/nodes/saveMemory';

// ---------------------------------------------------------------------------
// State Annotation (LangGraph v0.2+ Annotation API)
// ---------------------------------------------------------------------------

const GraphAnnotation = Annotation.Root({
  // ── Input fields ──────────────────────────────────────────────────────
  userId: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
  sessionId: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
  currentQuestion: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
  latestAnswer: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
  interviewState: Annotation<InterviewState | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),

  // ── Retrieved context ─────────────────────────────────────────────────
  resumeChunks: Annotation<ResumeChunk[]>({ reducer: (_a, b) => b, default: () => [] }),
  similarConversationTurns: Annotation<ConversationMemory[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  recentTurns: Annotation<ConversationMemory[]>({ reducer: (_a, b) => b, default: () => [] }),

  // ── Output ────────────────────────────────────────────────────────────
  generatedQuestion: Annotation<string>({ reducer: (_a, b) => b, default: () => '' }),
});

/** The shared state type — derived from the annotation */
export type GraphState = typeof GraphAnnotation.State;

// ---------------------------------------------------------------------------
// Build the LangGraph
// ---------------------------------------------------------------------------

/**
 * Compiled LangGraph for the interview RAG pipeline.
 *
 * Node execution order:
 *   retrieveResume → retrieveConversation → fetchRecentMemory
 *       → planner → questionGenerator → saveMemory → END
 */
function buildInterviewGraph() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(GraphAnnotation) as any;

  // ── Register nodes ──────────────────────────────────────────────────────
  graph.addNode('retrieveResume', retrieveResume);
  graph.addNode('retrieveConversation', retrieveConversation);
  graph.addNode('fetchRecentMemory', fetchRecentMemory);
  graph.addNode('planner', planner);
  graph.addNode('questionGenerator', questionGenerator);
  graph.addNode('saveMemory', saveMemory);

  // ── Entry point + sequential pipeline ──────────────────────────────────
  graph.addEdge('__start__', 'retrieveResume');
  graph.addEdge('retrieveResume', 'retrieveConversation');
  graph.addEdge('retrieveConversation', 'fetchRecentMemory');
  graph.addEdge('fetchRecentMemory', 'planner');
  graph.addEdge('planner', 'questionGenerator');
  graph.addEdge('questionGenerator', 'saveMemory');
  graph.addEdge('saveMemory', END);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return graph.compile() as any;
}

// Singleton compiled graph
let compiledGraph: ReturnType<typeof buildInterviewGraph> | null = null;

function getCompiledGraph() {
  if (!compiledGraph) {
    compiledGraph = buildInterviewGraph();
  }
  return compiledGraph;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RunInterviewRAGInput {
  userId: string;
  sessionId: string;
  currentQuestion: string;
  latestAnswer: string;
  interviewState: InterviewState | null;
}

export interface RunInterviewRAGOutput {
  generatedQuestion: string;
  updatedInterviewState: InterviewState | null;
}

/**
 * Execute the full RAG interview graph for one turn.
 *
 * @param input - The current interview turn context
 * @returns The generated follow-up question and updated interview state
 */
export async function runInterviewRAG(
  input: RunInterviewRAGInput,
): Promise<RunInterviewRAGOutput> {
  const graph = getCompiledGraph();

  const initialState: GraphState = {
    userId: input.userId,
    sessionId: input.sessionId,
    currentQuestion: input.currentQuestion,
    latestAnswer: input.latestAnswer,
    interviewState: input.interviewState,
    resumeChunks: [],
    similarConversationTurns: [],
    recentTurns: [],
    generatedQuestion: '',
  };

  const finalState = await graph.invoke(initialState);

  return {
    generatedQuestion: String(finalState.generatedQuestion),
    updatedInterviewState: finalState.interviewState as InterviewState | null,
  };
}
