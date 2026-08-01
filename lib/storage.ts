import { promises as fs } from "fs";
import path from "path";
import type { Project } from "./types";
const root = path.join(process.cwd(), "data");
export const storage = {
  async get(id: string): Promise<Project | null> { try { return JSON.parse(await fs.readFile(path.join(root, `${id}.json`), "utf8")); } catch { return null; } },
  async save(project: Project) { await fs.mkdir(root, { recursive: true }); await fs.writeFile(path.join(root, `${project.id}.json`), JSON.stringify(project, null, 2)); return project; }
};
