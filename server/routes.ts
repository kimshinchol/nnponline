import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, insertProjectSchema } from "@shared/schema";

function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin routes
  app.post("/api/users/:id/approve", ensureAdmin, async (req, res) => {
    try {
      const user = await storage.approveUser(parseInt(req.params.id));
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Task routes
  app.post("/api/tasks", ensureAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({ ...req.body, userId: req.user.id });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/tasks/user", ensureAuthenticated, async (req, res) => {
    const tasks = await storage.getUserTasks(req.user.id);
    res.json(tasks);
  });

  app.get("/api/tasks/team/:team", ensureAuthenticated, async (req, res) => {
    const tasks = await storage.getTeamTasks(req.params.team);
    res.json(tasks);
  });

  app.get("/api/tasks/project/:projectId", ensureAuthenticated, async (req, res) => {
    const tasks = await storage.getProjectTasks(parseInt(req.params.projectId));
    res.json(tasks);
  });

  app.patch("/api/tasks/:id/status", ensureAuthenticated, async (req, res) => {
    try {
      const task = await storage.updateTaskStatus(parseInt(req.params.id), req.body.status);
      res.json(task);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/tasks/:id", ensureAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Project routes
  app.post("/api/projects", ensureAuthenticated, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/projects", ensureAuthenticated, async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  const httpServer = createServer(app);
  return httpServer;
}
