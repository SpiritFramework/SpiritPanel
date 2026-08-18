/**
 * Database query optimization notes.
 *
 * Hot-path indexes live in `prisma/schema.prisma` (servers, subusers, schedules, activity_logs).
 * Prefer `select()` / filtered `where` clauses over loading full relations.
 */

export {};
