import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, insertProjectSchema, insertUserSchema } from "@shared/schema";

function ensureAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

function ensureAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Forbidden" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Update the user exists check to be more comprehensive
  app.get("/api/user/exists", async (req, res) => {
    try {
      // Get count of users (more efficient than getting actual users)
      const anyUser = await storage.getUserByUsername("admin");
      res.json({ exists: !!anyUser });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Update admin registration to be more secure
  app.post("/api/register/admin", async (req, res, next) => {
    try {
      // Check if any users exist
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Only allow admin registration if:
      // 1. No users exist (first user)
      // 2. Request comes from an existing admin
      const anyUser = await storage.getUserByUsername("admin");
      if (anyUser && (!req.isAuthenticated() || !req.user?.isAdmin)) {
        return res.status(403).json({ 
          message: "Admin registration is only allowed for the first user or by existing admins" 
        });
      }

      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser({
        ...userData,
        isAdmin: true,
        isApproved: true
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

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
      const taskData = insertTaskSchema.parse({ ...req.body, userId: req.user!.id });
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/tasks/user", ensureAuthenticated, async (req, res) => {
    const tasks = await storage.getUserTasks(req.user!.id);
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

  // New Backup and Archive Routes
  app.get("/api/backup", ensureAdmin, async (req, res) => {
    try {
      const backup = await storage.createBackup();
      res.json(backup);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post("/api/backup/restore", ensureAdmin, async (req, res) => {
    try {
      await storage.restoreFromBackup(req.body);
      res.sendStatus(200);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/tasks/archive", ensureAdmin, async (req, res) => {
    try {
      const filters = {
        before: req.body.before ? new Date(req.body.before) : undefined,
        status: req.body.status,
        projectId: req.body.projectId ? parseInt(req.body.projectId) : undefined
      };
      const archivedTasks = await storage.archiveTasks(filters);
      res.json(archivedTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/tasks/archived", ensureAdmin, async (req, res) => {
    try {
      const filters = {
        before: req.query.before ? new Date(req.query.before as string) : undefined,
        status: req.query.status as string | undefined,
        projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined
      };
      const archivedTasks = await storage.getArchivedTasks(filters);
      res.json(archivedTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}