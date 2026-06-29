// Drop-in replacement for the missing "@workspace/api-client-react" package.
// Every hook here matches the name and call shape the page components
// already expect, so the page code itself needed zero changes.

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, type Problem, type Solution, type Room, type RoomStats, type VoteType } from "./api";

// ---------------- Query key helpers ----------------

export const getListPublicProblemsQueryKey = () => ["problems", "public"] as const;
export const getGetProblemQueryKey = (id: number) => ["problems", id] as const;
export const getListProblemsQueryKey = (roomId: number) => ["rooms", roomId, "problems"] as const;
export const getListSolutionsQueryKey = (problemId: number) =>
  ["problems", problemId, "solutions"] as const;
export const getGetRoomQueryKey = (id: number) => ["rooms", id] as const;
export const getGetRoomStatsQueryKey = (id: number) => ["rooms", id, "stats"] as const;

// ---------------- Public problems ----------------

export function useListPublicProblems(options?: {
  query?: Partial<UseQueryOptions<Problem[]>>;
}) {
  return useQuery({
    queryKey: getListPublicProblemsQueryKey(),
    queryFn: () => api.listPublicProblems(),
    ...options?.query,
  });
}

export function useCreatePublicProblem() {
  return useMutation({
    mutationFn: (vars: { data: { title: string; description: string; authorName: string } }) =>
      api.createPublicProblem(vars.data),
  });
}

// ---------------- Room-scoped problems ----------------

export function useListProblems(
  roomId: number,
  options?: { query?: Partial<UseQueryOptions<Problem[]>> }
) {
  return useQuery({
    queryKey: getListProblemsQueryKey(roomId),
    queryFn: () => api.listProblems(roomId),
    ...options?.query,
  });
}

export function useCreateProblem() {
  return useMutation({
    mutationFn: (vars: {
      roomId: number;
      data: { title: string; description: string; authorName: string };
    }) => api.createProblem(vars.roomId, vars.data),
  });
}

// ---------------- Single problem ----------------

export function useGetProblem(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Problem>> }
) {
  return useQuery({
    queryKey: getGetProblemQueryKey(id),
    queryFn: () => api.getProblem(id),
    ...options?.query,
  });
}

export function useDeleteProblem() {
  return useMutation({
    mutationFn: (vars: { problemId: number }) => api.deleteProblem(vars.problemId),
  });
}

export function useVoteProblem() {
  return useMutation({
    mutationFn: (vars: { problemId: number; data: { voteType: VoteType; voterToken: string } }) =>
      api.voteProblem(vars.problemId, vars.data),
  });
}

// ---------------- Solutions ----------------

export function useListSolutions(
  problemId: number,
  options?: { query?: Partial<UseQueryOptions<Solution[]>> }
) {
  return useQuery({
    queryKey: getListSolutionsQueryKey(problemId),
    queryFn: () => api.listSolutions(problemId),
    ...options?.query,
  });
}

export function useCreateSolution() {
  return useMutation({
    mutationFn: (vars: { problemId: number; data: { content: string; authorName: string } }) =>
      api.createSolution(vars.problemId, vars.data),
  });
}

export function useDeleteSolution() {
  return useMutation({
    mutationFn: (vars: { solutionId: number }) => api.deleteSolution(vars.solutionId),
  });
}

export function useVoteSolution() {
  return useMutation({
    mutationFn: (vars: {
      solutionId: number;
      data: { voteType: VoteType; voterToken: string };
    }) => api.voteSolution(vars.solutionId, vars.data),
  });
}

// ---------------- Rooms ----------------

export function useCreateRoom() {
  return useMutation({
    mutationFn: (vars: { data: { name: string; isPrivate: boolean; code: string | null } }) =>
      api.createRoom(vars.data),
  });
}

export function useGetRoom(
  id: number,
  options?: { query?: Partial<UseQueryOptions<Room>> }
) {
  return useQuery({
    queryKey: getGetRoomQueryKey(id),
    queryFn: () => api.getRoom(id),
    ...options?.query,
  });
}

// Matches the original usage: useJoinRoom(joinCode, { query: { enabled: false, ... } })
// then `await joinRoomRefetch()` is called manually on form submit.
export function useJoinRoom(
  code: string,
  options?: { query?: Partial<UseQueryOptions<Room>> & { queryKey?: unknown[] } }
) {
  return useQuery({
    queryKey: ["joinRoom", code],
    queryFn: () => api.joinRoom(code),
    retry: false,
    ...options?.query,
  });
}

export function useGetRoomStats(
  id: number,
  options?: { query?: Partial<UseQueryOptions<RoomStats>> }
) {
  return useQuery({
    queryKey: getGetRoomStatsQueryKey(id),
    queryFn: () => api.getRoomStats(id),
    ...options?.query,
  });
}
