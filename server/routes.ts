import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, insertProjectSchema, insertUserSchema } from "@shared/schema";
import passport from 'passport'; // Import passport

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

// Add helper function at the top of the file, after imports
function isTaskFromToday(taskDate: Date): boolean {
  const kstOffset = 9 * 60; // KST is UTC+9
  const taskKST = new Date(taskDate.getTime() + kstOffset * 60000);
  const nowKST = new Date(Date.now() + kstOffset * 60000);

  return (
    taskKST.getFullYear() === nowKST.getFullYear() &&
    taskKST.getMonth() === nowKST.getMonth() &&
    taskKST.getDate() === nowKST.getDate()
  );
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

  // Regular user registration (non-admin)
  app.post("/api/register", async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        isAdmin: false, // Regular users can't be admin
        isApproved: false // All new users start unapproved
      });

      res.status(201).json({
        ...user,
        message: "Registration successful. Please wait for admin approval to log in."
      });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Admin-only registration route
  app.post("/api/web_admin/register", async (req, res, next) => {
    try {
      // Check if any users exist
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Get count of admin users
      const users = await storage.getUsers();
      const adminCount = Array.from(users.values()).filter(u => u.isAdmin).length;

      // Only allow admin registration if:
      // 1. No users exist (first user)
      // 2. Only one admin exists and request comes from an existing admin
      if (adminCount >= 2) {
        return res.status(403).json({
          message: "Maximum number of admin accounts (2) has been reached"
        });
      }

      if (adminCount > 0 && (!req.isAuthenticated() || !req.user?.isAdmin)) {
        return res.status(403).json({
          message: "Admin registration is only allowed for the first user or by existing admins"
        });
      }

      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
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

  // Admin login route needs to check isAdmin flag
  app.post("/api/web_admin/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check if user is an admin
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Use passport authenticate manually for admin login
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) { return next(err); }
        if (!user) { return res.status(401).json({ message: info.message }); }

        req.logIn(user, (err) => {
          if (err) { return next(err); }
          return res.json(user);
        });
      })(req, res, next);

    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Admin login must check isAdmin flag
  app.post("/api/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Add approval check
      if (!user.isApproved) {
        return res.status(403).json({
          message: "Your account is pending approval. Please wait for an administrator to approve your account."
        });
      }

      next();
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

  // Add route to get pending users
  app.get("/api/users/pending", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const pendingUsers = Array.from(users.values()).filter(user => !user.isApproved && !user.isAdmin);
      res.json(pendingUsers);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Get approved users
  app.get("/api/users/approved", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const approvedUsers = Array.from(users.values()).filter(user => user.isApproved);
      res.json(approvedUsers);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Delete user
  app.delete("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isAdmin) {
        return res.status(403).json({ message: "Cannot delete admin users" });
      }

      await storage.deleteUser(userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Update user
  app.patch("/api/users/:id", ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isAdmin) {
        return res.status(403).json({ message: "Cannot modify admin users" });
      }

      const updatedUser = await storage.updateUser(userId, req.body);
      res.json(updatedUser);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Task routes
  app.post("/api/tasks", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Creating task with data:", req.body);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user!.id,
        status: req.body.status || "pending",
        createdAt: new Date()
      });

      const task = await storage.createTask(taskData);
      console.log("Task created successfully:", task);
      res.status(201).json(task);
    } catch (err) {
      console.error("Error creating task:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Update getUserTasks endpoint
  app.get("/api/tasks/user", ensureAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getUserTasks(req.user!.id);

      // If date is provided (for scheduler), use that date for filtering
      if (req.query.date) {
        const filterDate = new Date(req.query.date as string);
        const kstOffset = 9 * 60;
        const kstFilterDate = new Date(filterDate.getTime() + kstOffset * 60000);

        const filteredTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt);
          const kstTaskDate = new Date(taskDate.getTime() + kstOffset * 60000);

          return (
            kstTaskDate.getFullYear() === kstFilterDate.getFullYear() &&
            kstTaskDate.getMonth() === kstFilterDate.getMonth() &&
            kstTaskDate.getDate() === kstFilterDate.getDate()
          );
        });
        return res.json(filteredTasks);
      }

      // Otherwise, only return today's tasks (KST)
      const todaysTasks = tasks.filter(task => isTaskFromToday(new Date(task.createdAt)));
      res.json(todaysTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Add this endpoint after other task routes
  app.get("/api/tasks/date", ensureAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const users = Array.from((await storage.getUsers()).values());

      // If date is provided, filter tasks for that date
      if (req.query.date) {
        const filterDate = new Date(req.query.date as string);
        const kstOffset = 9 * 60;
        const kstFilterDate = new Date(filterDate.getTime() + kstOffset * 60000);
        kstFilterDate.setHours(0, 0, 0, 0);

        const filteredTasks = tasks.filter(task => {
          const taskDate = new Date(task.createdAt);
          const kstTaskDate = new Date(taskDate.getTime() + kstOffset * 60000);
          kstTaskDate.setHours(0, 0, 0, 0);

          return (
            kstTaskDate.getTime() === kstFilterDate.getTime()
          );
        });

        // Add username to each task
        const tasksWithUsernames = filteredTasks.map(task => {
          const user = users.find(u => u.id === task.userId);
          return {
            ...task,
            username: user?.username || 'Unknown'
          };
        });

        return res.json(tasksWithUsernames);
      }

      res.json([]);
    } catch (err) {
      console.error("Error fetching tasks by date:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Add this endpoint after other task routes
  app.get("/api/tasks/previous", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Fetching last recorded tasks for user:", req.user!.id);
      const tasks = await storage.getUserTasks(req.user!.id);

      // Sort tasks by date in descending order
      const sortedTasks = tasks.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (sortedTasks.length === 0) {
        return res.json([]);
      }

      // Get the date of the most recent task
      const kstOffset = 9 * 60; // KST is UTC+9
      const mostRecentTaskDate = new Date(sortedTasks[0].createdAt);
      const mostRecentKST = new Date(mostRecentTaskDate.getTime() + kstOffset * 60000);
      mostRecentKST.setHours(0, 0, 0, 0);

      console.log("Most recent task date (KST):", mostRecentKST.toISOString());

      // Filter tasks from the most recent day
      const lastDayTasks = sortedTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        const taskKST = new Date(taskDate.getTime() + kstOffset * 60000);
        taskKST.setHours(0, 0, 0, 0);

        console.log("Comparing task date (KST):", taskKST.toISOString(), "for task:", task.title);
        return taskKST.getTime() === mostRecentKST.getTime();
      });

      console.log("Found tasks from last recorded day:", lastDayTasks.length);
      res.json(lastDayTasks);
    } catch (err) {
      console.error("Error fetching last recorded tasks:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Update team tasks endpoint
  app.get("/api/tasks/team/:team", ensureAuthenticated, async (req, res) => {
    try {
      const users = Array.from((await storage.getUsers()).values());
      const teamUsers = users.filter(user => user.team === req.params.team);
      const teamUserIds = teamUsers.map(user => user.id);

      const allTasks = await storage.getAllTasks();

      // Filter tasks for team members and today only (KST)
      const tasks = allTasks.filter(task =>
        teamUserIds.includes(task.userId) &&
        isTaskFromToday(new Date(task.createdAt))
      );

      const tasksWithUsernames = tasks.map(task => {
        const user = users.find(u => u.id === task.userId);
        return {
          ...task,
          username: user?.username || 'Unknown'
        };
      });

      res.json(tasksWithUsernames);
    } catch (err) {
      console.error("Error fetching team tasks:", err);
      res.status(400).json({ message: (err as Error).message });
    }
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

  app.patch("/api/tasks/:id", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Updating task:", req.params.id, req.body);
      const taskData = await storage.updateTask(parseInt(req.params.id), req.body);
      console.log("Task updated successfully:", taskData);
      res.json(taskData);
    } catch (err) {
      console.error("Error updating task:", err);
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

  // Update the project tasks endpoint to properly handle project tasks
  app.get("/api/tasks/project", ensureAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      const users = Array.from((await storage.getUsers()).values());

      // Add username to each task and filter only today's tasks with projectId
      const projectTasks = tasks
        .filter(task =>
          task.projectId !== null &&
          isTaskFromToday(new Date(task.createdAt))
        )
        .map(task => {
          const user = users.find(u => u.id === task.userId);
          return {
            ...task,
            username: user?.username || 'Unknown'
          };
        });

      res.json(projectTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });


  // Delete project
  app.delete("/api/projects/:id", ensureAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
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