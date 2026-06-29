// Data access layer — all SQL lives here. Routes never write SQL directly.
// Every function returns plain camelCase objects ready for JSON responses.

import { pool } from "./pool.js";

// ---------- mapping helpers (snake_case columns -> camelCase API shape) ----------

function mapRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isPrivate: row.is_private,
    createdAt: row.created_at,
  };
}

function mapProblem(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    description: row.description,
    authorName: row.author_name,
    createdAt: row.created_at,
    likesCount: Number(row.likes_count ?? 0),
    dislikesCount: Number(row.dislikes_count ?? 0),
    solutionsCount: Number(row.solutions_count ?? 0),
  };
}

function mapSolution(row) {
  if (!row) return null;
  return {
    id: row.id,
    problemId: row.problem_id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
    likesCount: Number(row.likes_count ?? 0),
    dislikesCount: Number(row.dislikes_count ?? 0),
  };
}

// Reusable vote-count subqueries, inlined into the main queries below so
// counts are always computed fresh from the votes table (no denormalized
// counters to keep in sync).
const PROBLEM_SELECT = `
  SELECT
    p.*,
    COALESCE(SUM(CASE WHEN v.vote_type = 'like' THEN 1 ELSE 0 END), 0) AS likes_count,
    COALESCE(SUM(CASE WHEN v.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes_count,
    (SELECT COUNT(*) FROM solutions s WHERE s.problem_id = p.id) AS solutions_count
  FROM problems p
  LEFT JOIN votes v ON v.target_type = 'problem' AND v.target_id = p.id
`;

const SOLUTION_SELECT = `
  SELECT
    s.*,
    COALESCE(SUM(CASE WHEN v.vote_type = 'like' THEN 1 ELSE 0 END), 0) AS likes_count,
    COALESCE(SUM(CASE WHEN v.vote_type = 'dislike' THEN 1 ELSE 0 END), 0) AS dislikes_count
  FROM solutions s
  LEFT JOIN votes v ON v.target_type = 'solution' AND v.target_id = s.id
`;

// Postgres won't let us reference the SUM(...) aliases directly in ORDER BY
// on the same query reliably, so we wrap the aggregated query in a subquery
// and sort that instead — simple and guaranteed to work.
function orderByScore(innerSql) {
  return `SELECT * FROM (${innerSql}) AS scored ORDER BY (likes_count - dislikes_count) DESC, created_at DESC`;
}

function generatePublicJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const db = {
  // ---------------- Rooms ----------------

  async createRoom({ name, isPrivate, code }) {
    const finalCode = isPrivate && code ? code.toUpperCase() : generatePublicJoinCode();
    const { rows } = await pool.query(
      `INSERT INTO rooms (name, code, is_private) VALUES ($1, $2, $3) RETURNING *`,
      [name, finalCode, !!isPrivate]
    );
    return mapRoom(rows[0]);
  },

  async getRoomById(id) {
    const { rows } = await pool.query(`SELECT * FROM rooms WHERE id = $1`, [id]);
    return mapRoom(rows[0]);
  },

  async getRoomByCode(code) {
    const { rows } = await pool.query(
      `SELECT * FROM rooms WHERE UPPER(code) = UPPER($1)`,
      [code]
    );
    return mapRoom(rows[0]);
  },

  async getRoomStats(roomId) {
    const { rows } = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM problems WHERE room_id = $1) AS total_problems,
        (SELECT COUNT(*) FROM solutions s JOIN problems p ON p.id = s.problem_id WHERE p.room_id = $1) AS total_solutions,
        (
          (SELECT COUNT(*) FROM votes v JOIN problems p ON v.target_type = 'problem' AND p.id = v.target_id WHERE p.room_id = $1)
          +
          (SELECT COUNT(*) FROM votes v JOIN solutions s ON v.target_type = 'solution' AND s.id = v.target_id JOIN problems p ON p.id = s.problem_id WHERE p.room_id = $1)
        ) AS total_votes
      `,
      [roomId]
    );
    const row = rows[0];
    return {
      totalProblems: Number(row.total_problems),
      totalSolutions: Number(row.total_solutions),
      totalVotes: Number(row.total_votes),
    };
  },

  // ---------------- Problems ----------------

  async createProblem({ roomId, title, description, authorName }) {
    const { rows } = await pool.query(
      `INSERT INTO problems (room_id, title, description, author_name) VALUES ($1, $2, $3, $4) RETURNING *`,
      [roomId ?? null, title, description, authorName]
    );
    return this.getProblemById(rows[0].id);
  },

  async getProblemById(id) {
    const { rows } = await pool.query(
      `${PROBLEM_SELECT} WHERE p.id = $1 GROUP BY p.id`,
      [id]
    );
    return mapProblem(rows[0]);
  },

  async listPublicProblems() {
    const { rows } = await pool.query(
      orderByScore(`${PROBLEM_SELECT} WHERE p.room_id IS NULL GROUP BY p.id`)
    );
    return rows.map(mapProblem);
  },

  async listProblemsByRoom(roomId) {
    const { rows } = await pool.query(
      orderByScore(`${PROBLEM_SELECT} WHERE p.room_id = $1 GROUP BY p.id`),
      [roomId]
    );
    return rows.map(mapProblem);
  },

  async deleteProblem(id) {
    const { rowCount } = await pool.query(`DELETE FROM problems WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  // ---------------- Solutions ----------------

  async createSolution({ problemId, content, authorName }) {
    const { rows } = await pool.query(
      `INSERT INTO solutions (problem_id, content, author_name) VALUES ($1, $2, $3) RETURNING *`,
      [problemId, content, authorName]
    );
    return this.getSolutionById(rows[0].id);
  },

  async getSolutionById(id) {
    const { rows } = await pool.query(
      `${SOLUTION_SELECT} WHERE s.id = $1 GROUP BY s.id`,
      [id]
    );
    return mapSolution(rows[0]);
  },

  async listSolutionsByProblem(problemId) {
    const { rows } = await pool.query(
      orderByScore(`${SOLUTION_SELECT} WHERE s.problem_id = $1 GROUP BY s.id`),
      [problemId]
    );
    return rows.map(mapSolution);
  },

  async deleteSolution(id) {
    const { rowCount } = await pool.query(`DELETE FROM solutions WHERE id = $1`, [id]);
    return rowCount > 0;
  },

  // ---------------- Votes ----------------
  // Clicking the same vote twice retracts it; switching like<->dislike updates it.

  async voteOnProblem(problemId, voterToken, voteType) {
    await this._castVote("problem", problemId, voterToken, voteType);
    return this.getProblemById(problemId);
  },

  async voteOnSolution(solutionId, voterToken, voteType) {
    await this._castVote("solution", solutionId, voterToken, voteType);
    return this.getSolutionById(solutionId);
  },

  async _castVote(targetType, targetId, voterToken, voteType) {
    const { rows } = await pool.query(
      `SELECT * FROM votes WHERE target_type = $1 AND target_id = $2 AND voter_token = $3`,
      [targetType, targetId, voterToken]
    );
    const existing = rows[0];

    if (existing) {
      if (existing.vote_type === voteType) {
        await pool.query(`DELETE FROM votes WHERE id = $1`, [existing.id]);
      } else {
        await pool.query(`UPDATE votes SET vote_type = $1 WHERE id = $2`, [
          voteType,
          existing.id,
        ]);
      }
    } else {
      await pool.query(
        `INSERT INTO votes (target_type, target_id, voter_token, vote_type) VALUES ($1, $2, $3, $4)`,
        [targetType, targetId, voterToken, voteType]
      );
    }
  },
};
