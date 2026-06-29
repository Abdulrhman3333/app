// Plain-fetch API client talking to our own Express backend.
// In dev, Vite's proxy forwards /api/* to the backend (see vite.config.ts).
// In production, the backend serves the built frontend itself, so /api/*
// is always same-origin — no base URL configuration needed either way.

export interface Problem {
  id: number;
  roomId: number | null;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
  solutionsCount: number;
}

export interface Solution {
  id: number;
  problemId: number;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
}

export interface Room {
  id: number;
  name: string;
  code: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface RoomStats {
  totalProblems: number;
  totalSolutions: number;
  totalVotes: number;
}

export type VoteType = "like" | "dislike";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Public problems
  listPublicProblems: () => request<Problem[]>("/problems/public"),
  createPublicProblem: (data: { title: string; description: string; authorName: string }) =>
    request<Problem>("/problems/public", { method: "POST", body: JSON.stringify(data) }),

  // Room-scoped problems
  listProblems: (roomId: number) => request<Problem[]>(`/rooms/${roomId}/problems`),
  createProblem: (
    roomId: number,
    data: { title: string; description: string; authorName: string }
  ) =>
    request<Problem>(`/rooms/${roomId}/problems`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Single problem
  getProblem: (problemId: number) => request<Problem>(`/problems/${problemId}`),
  deleteProblem: (problemId: number) =>
    request<void>(`/problems/${problemId}`, { method: "DELETE" }),
  voteProblem: (problemId: number, data: { voteType: VoteType; voterToken: string }) =>
    request<Problem>(`/problems/${problemId}/vote`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Solutions
  listSolutions: (problemId: number) => request<Solution[]>(`/problems/${problemId}/solutions`),
  createSolution: (problemId: number, data: { content: string; authorName: string }) =>
    request<Solution>(`/problems/${problemId}/solutions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteSolution: (solutionId: number) =>
    request<void>(`/solutions/${solutionId}`, { method: "DELETE" }),
  voteSolution: (solutionId: number, data: { voteType: VoteType; voterToken: string }) =>
    request<Solution>(`/solutions/${solutionId}/vote`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Rooms
  createRoom: (data: { name: string; isPrivate: boolean; code: string | null }) =>
    request<Room>("/rooms", { method: "POST", body: JSON.stringify(data) }),
  getRoom: (roomId: number) => request<Room>(`/rooms/${roomId}`),
  joinRoom: (code: string) => request<Room>(`/rooms/join/${encodeURIComponent(code)}`),
  getRoomStats: (roomId: number) => request<RoomStats>(`/rooms/${roomId}/stats`),
};

export { ApiError };
