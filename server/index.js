import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Small wrapper so route handlers can `await` and errors are caught
// automatically instead of needing try/catch in every single route.
function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

app.post(
  "/api/rooms",
  route(async (req, res) => {
    const { name, isPrivate, code } = req.body ?? {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (isPrivate && (!code || !String(code).trim())) {
      return res.status(400).json({ error: "code is required for private rooms" });
    }
    const room = await db.createRoom({
      name: name.trim(),
      isPrivate: !!isPrivate,
      code: code ? String(code).trim() : null,
    });
    res.status(201).json(room);
  })
);

app.get(
  "/api/rooms/:id",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid room id" });
    const room = await db.getRoomById(id);
    if (!room) return res.status(404).json({ error: "room not found" });
    res.json(room);
  })
);

// Join-by-code. Matches the frontend's useJoinRoom(joinCode) hook contract.
app.get(
  "/api/rooms/join/:code",
  route(async (req, res) => {
    const { code } = req.params;
    if (!code || !code.trim()) return res.status(400).json({ error: "code is required" });
    const room = await db.getRoomByCode(code.trim());
    if (!room) return res.status(404).json({ error: "room not found" });
    res.json(room);
  })
);

app.get(
  "/api/rooms/:id/stats",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid room id" });
    const stats = await db.getRoomStats(id);
    res.json(stats);
  })
);

// ---------------------------------------------------------------------------
// Problems — public feed (no room) and room-scoped
// ---------------------------------------------------------------------------

app.get(
  "/api/problems/public",
  route(async (_req, res) => {
    const problems = await db.listPublicProblems();
    res.json(problems);
  })
);

app.post(
  "/api/problems/public",
  route(async (req, res) => {
    const { title, description, authorName } = req.body ?? {};
    if (!title?.trim() || !description?.trim() || !authorName?.trim()) {
      return res.status(400).json({ error: "title, description and authorName are required" });
    }
    const problem = await db.createProblem({
      roomId: null,
      title: title.trim(),
      description: description.trim(),
      authorName: authorName.trim(),
    });
    res.status(201).json(problem);
  })
);

app.get(
  "/api/rooms/:roomId/problems",
  route(async (req, res) => {
    const roomId = parseId(req.params.roomId);
    if (!roomId) return res.status(400).json({ error: "invalid room id" });
    const problems = await db.listProblemsByRoom(roomId);
    res.json(problems);
  })
);

app.post(
  "/api/rooms/:roomId/problems",
  route(async (req, res) => {
    const roomId = parseId(req.params.roomId);
    if (!roomId) return res.status(400).json({ error: "invalid room id" });
    const { title, description, authorName } = req.body ?? {};
    if (!title?.trim() || !description?.trim() || !authorName?.trim()) {
      return res.status(400).json({ error: "title, description and authorName are required" });
    }
    const problem = await db.createProblem({
      roomId,
      title: title.trim(),
      description: description.trim(),
      authorName: authorName.trim(),
    });
    res.status(201).json(problem);
  })
);

app.get(
  "/api/problems/:id",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid problem id" });
    const problem = await db.getProblemById(id);
    if (!problem) return res.status(404).json({ error: "problem not found" });
    res.json(problem);
  })
);

app.delete(
  "/api/problems/:id",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid problem id" });
    const ok = await db.deleteProblem(id);
    if (!ok) return res.status(404).json({ error: "problem not found" });
    res.status(204).end();
  })
);

app.post(
  "/api/problems/:id/vote",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid problem id" });
    const { voteType, voterToken } = req.body ?? {};
    if (!["like", "dislike"].includes(voteType) || !voterToken) {
      return res.status(400).json({ error: "voteType (like|dislike) and voterToken are required" });
    }
    const problem = await db.voteOnProblem(id, voterToken, voteType);
    if (!problem) return res.status(404).json({ error: "problem not found" });
    res.json(problem);
  })
);

// ---------------------------------------------------------------------------
// Solutions
// ---------------------------------------------------------------------------

app.get(
  "/api/problems/:problemId/solutions",
  route(async (req, res) => {
    const problemId = parseId(req.params.problemId);
    if (!problemId) return res.status(400).json({ error: "invalid problem id" });
    const solutions = await db.listSolutionsByProblem(problemId);
    res.json(solutions);
  })
);

app.post(
  "/api/problems/:problemId/solutions",
  route(async (req, res) => {
    const problemId = parseId(req.params.problemId);
    if (!problemId) return res.status(400).json({ error: "invalid problem id" });
    const { content, authorName } = req.body ?? {};
    if (!content?.trim() || !authorName?.trim()) {
      return res.status(400).json({ error: "content and authorName are required" });
    }
    const solution = await db.createSolution({
      problemId,
      content: content.trim(),
      authorName: authorName.trim(),
    });
    res.status(201).json(solution);
  })
);

app.delete(
  "/api/solutions/:id",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid solution id" });
    const ok = await db.deleteSolution(id);
    if (!ok) return res.status(404).json({ error: "solution not found" });
    res.status(204).end();
  })
);

app.post(
  "/api/solutions/:id/vote",
  route(async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid solution id" });
    const { voteType, voterToken } = req.body ?? {};
    if (!["like", "dislike"].includes(voteType) || !voterToken) {
      return res.status(400).json({ error: "voteType (like|dislike) and voterToken are required" });
    }
    const solution = await db.voteOnSolution(id, voterToken, voteType);
    if (!solution) return res.status(404).json({ error: "solution not found" });
    res.json(solution);
  })
);

// ---------------------------------------------------------------------------
// Health check (useful for hosting platforms that ping a health endpoint)
// ---------------------------------------------------------------------------

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Serve the built frontend in production (single-service deploy).
// In development, the Vite dev server runs separately on its own port.
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "not found" });
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
