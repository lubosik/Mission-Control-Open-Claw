/**
 * Data layer - uses in-memory store for Vercel/serverless compatibility.
 * SQLite was removed: Vercel's read-only filesystem and stateless functions
 * don't support persistent SQLite. For production persistence, add a
 * remote DB (Postgres, MongoDB, etc.) and swap this implementation.
 */
import { projectStore, taskStore, costStore, activityStore, skillsStore, cronJobsStore, channelsStore } from './store.js';

export { projectStore, taskStore, costStore, activityStore, skillsStore, cronJobsStore, channelsStore };

export const db = {
  projects: projectStore,
  tasks: taskStore,
  costs: costStore,
  activity: activityStore,
  skills: skillsStore,
  cronJobs: cronJobsStore,
  channels: channelsStore
};

export default db;
