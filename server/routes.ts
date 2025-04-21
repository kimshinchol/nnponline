import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertTaskSchema, insertProjectSchema, insertUserSchema } from "@shared/schema";
import passport from 'passport';
import { pool } from './db'; // Assuming a pool object exists for database connection
import { queryClient } from './queryClient'; // Import queryClient
import * as XLSX from 'xlsx'; // Import XLSX for Excel file generation

// Add function to create default admin user
async function createDefaultAdminIfNeeded() {
  try {
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      const hashedPassword = await hashPassword("Admin123@");
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        team: "MT", // Added required team field
        isAdmin: true,
        isApproved: true
      });
      console.log("Created default admin user");
    }
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
}

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
  res.status(403).json({ message: "Forbidden. Admin access required." });
}

// Add health check endpoint at the start of registerRoutes
export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      // Test database connection
      const client = await pool.connect();
      client.release();
      res.json({ status: "healthy", message: "Server is running and database is connected" });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(503).json({ status: "unhealthy", message: "Database connection failed" });
    }
  });

  // Create default admin user before setting up routes
  await createDefaultAdminIfNeeded();

  setupAuth(app);

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.get("/api/user/exists", async (req, res) => {
    try {
      const anyUser = await storage.getUserByUsername("admin");
      res.json({ exists: !!anyUser });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

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
        isAdmin: false,
        isApproved: false
      });

      res.status(201).json({
        ...user,
        message: "Registration successful. Please wait for admin approval to log in."
      });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/web_admin/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const users = await storage.getUsers();
      const adminCount = Array.from(users.values()).filter(u => u.isAdmin).length;

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

  app.post("/api/web_admin/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

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

  app.post("/api/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByUsername(req.body.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

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

  app.post("/api/users/:id/approve", ensureAdmin, async (req, res) => {
    try {
      const user = await storage.approveUser(parseInt(req.params.id));
      res.json(user);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/users/pending", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const pendingUsers = Array.from(users.values()).filter(user => !user.isApproved && !user.isAdmin);
      res.json(pendingUsers);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/users/approved", ensureAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const approvedUsers = Array.from(users.values()).filter(user => user.isApproved);
      res.json(approvedUsers);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

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

  app.post("/api/tasks", ensureAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user!.id,
        status: req.body.status || "작업전",
        createdAt: new Date()
      });

      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/tasks/user", ensureAuthenticated, async (req, res) => {
    try {
      const allTasks = await storage.getUserTasks(req.user!.id);

      // Filter out archived tasks and co-work tasks
      const activeTasks = allTasks.filter(task =>
        !task.isArchived &&
        !task.isCoWork // Exclude co-work tasks from regular task view
      );

      if (req.query.date) {
        const filterDate = new Date(req.query.date as string);
        const kstOffset = 9 * 60;
        const kstFilterDate = new Date(filterDate.getTime() + kstOffset * 60000);

        const filteredTasks = activeTasks.filter(task => {
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

      const todaysTasks = activeTasks.filter(task => isTaskFromToday(new Date(task.createdAt)));
      res.json(todaysTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  function isTaskFromToday(taskDate: Date): boolean {
    const kstOffset = 9 * 60;
    const taskKST = new Date(taskDate.getTime() + kstOffset * 60000);
    const nowKST = new Date(Date.now() + kstOffset * 60000);

    return (
      taskKST.getFullYear() === nowKST.getFullYear() &&
      taskKST.getMonth() === nowKST.getMonth() &&
      taskKST.getDate() === nowKST.getDate()
    );
  }

  app.get("/api/tasks/date", ensureAuthenticated, async (req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      const users = Array.from((await storage.getUsers()).values());

      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);

      if (req.query.date) {
        const filterDate = new Date(req.query.date as string);
        const kstOffset = 9 * 60;
        const kstFilterDate = new Date(filterDate.getTime() + kstOffset * 60000);
        kstFilterDate.setHours(0, 0, 0, 0);

        const filteredTasks = activeTasks.filter(task => {
          const taskDate = new Date(task.createdAt);
          const kstTaskDate = new Date(taskDate.getTime() + kstOffset * 60000);
          kstTaskDate.setHours(0, 0, 0, 0);

          // Add isCoWork check to filter out co-work tasks
          return (
            kstTaskDate.getTime() === kstFilterDate.getTime() &&
            !task.isCoWork // Exclude co-work tasks
          );
        });

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

  app.get("/api/tasks/previous", ensureAuthenticated, async (req, res) => {
    try {
      const allTasks = await storage.getUserTasks(req.user!.id);
      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);

      const sortedTasks = activeTasks.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (sortedTasks.length === 0) {
        return res.json([]);
      }

      const kstOffset = 9 * 60;
      const mostRecentTaskDate = new Date(sortedTasks[0].createdAt);
      const mostRecentKST = new Date(mostRecentTaskDate.getTime() + kstOffset * 60000);
      mostRecentKST.setHours(0, 0, 0, 0);

      const lastDayTasks = sortedTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        const taskKST = new Date(taskDate.getTime() + kstOffset * 60000);
        taskKST.setHours(0, 0, 0, 0);

        return taskKST.getTime() === mostRecentKST.getTime();
      });

      res.json(lastDayTasks);
    } catch (err) {
      console.error("Error fetching last recorded tasks:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.get("/api/tasks/team/:team", ensureAuthenticated, async (req, res) => {
    try {
      const users = Array.from((await storage.getUsers()).values());
      const teamUsers = users.filter(user => user.team === req.params.team);
      const teamUserIds = teamUsers.map(user => user.id);

      const allTasks = await storage.getAllTasks();
      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);

      const tasks = activeTasks.filter(task => {
        const isTaskFromCurrentDay = isTaskFromToday(new Date(task.createdAt));
        const isTeamMemberTask = teamUserIds.includes(task.userId);
        // Exclude co-work tasks
        const isNotCoWork = !task.isCoWork;
        return isTaskFromCurrentDay && isTeamMemberTask && isNotCoWork;
      });

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
    try {
      const allTasks = await storage.getProjectTasks(parseInt(req.params.projectId));
      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);
      // Filter out co-work tasks
      const nonCoWorkTasks = activeTasks.filter(task => !task.isCoWork);
      res.json(nonCoWorkTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
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
      const taskData = await storage.updateTask(parseInt(req.params.id), req.body);
      res.json(taskData);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

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

  app.get("/api/tasks/project", ensureAuthenticated, async (req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);
      const users = Array.from((await storage.getUsers()).values());

      const projectTasks = activeTasks
        .filter(task =>
          task.projectId !== null &&
          isTaskFromToday(new Date(task.createdAt)) &&
          !task.isCoWork // Exclude co-work tasks
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


  app.delete("/api/projects/:id", ensureAuthenticated, async (req, res) => {
    try {
      await storage.deleteProject(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.patch("/api/projects/:id", ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.updateProject(projectId, req.body);
      res.json(project);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

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

  // Add new co-work routes after the existing task routes
  app.get("/api/tasks/co-work", ensureAuthenticated, async (req, res) => {
    try {
      const allTasks = await storage.getAllTasks();
      // Filter out archived tasks
      const activeTasks = allTasks.filter(task => !task.isArchived);
      const users = Array.from((await storage.getUsers()).values());

      const coWorkTasks = activeTasks
        .filter(task => task.isCoWork)
        .map(task => {
          const user = users.find(u => u.id === task.userId);
          return {
            ...task,
            username: user?.username || 'Unknown'
          };
        });

      res.json(coWorkTasks);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post("/api/tasks/co-work", ensureAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user!.id,
        status: "작업전",
        isCoWork: true,
        createdAt: new Date()
      });

      console.log("Creating co-work task with data:", taskData); // Add logging
      const task = await storage.createTask(taskData);
      console.log("Created co-work task:", task); // Add logging

      res.status(201).json(task);
    } catch (err) {
      console.error("Error creating co-work task:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Update the accept task endpoint to preserve metadata
  app.post("/api/tasks/co-work/:id/accept", ensureAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      const user = req.user!;

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!task.isCoWork) {
        return res.status(400).json({ message: "This is not a co-work task" });
      }

      // Transfer ownership to the accepting user while preserving metadata
      const updatedTask = await storage.updateTask(taskId, {
        userId: user.id,
        username: user.username,
        isCoWork: false, // Remove co-work flag to make it a personal task
        // Keep all other metadata unchanged
      });

      // Invalidate relevant queries to trigger automatic updates
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/project"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/team"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/co-work"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks/date"] });

      res.json(updatedTask);
    } catch (err) {
      console.error("Error accepting co-work task:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete("/api/tasks/co-work/:id", ensureAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!task.isCoWork) {
        return res.status(400).json({ message: "This is not a co-work task" });
      }

      await storage.deleteTask(taskId);
      res.sendStatus(204);
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Add new endpoint to move personal task to co-work
  app.post("/api/tasks/:id/move-to-cowork", ensureAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.userId !== req.user!.id) {
        return res.status(403).json({ message: "You can only move your own tasks to co-work" });
      }

      if (task.isCoWork) {
        return res.status(400).json({ message: "Task is already in co-work" });
      }

      // Update task to be a co-work task
      const updatedTask = await storage.updateTask(taskId, {
        isCoWork: true,
        // Keep original task details for history
        originalUserId: task.userId,
        originalUsername: task.username
      });

      res.json(updatedTask);
    } catch (err) {
      console.error("Error moving task to co-work:", err);
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Add session refresh route
  app.post("/api/session/refresh", (req, res) => {
    if (req.isAuthenticated()) {
      // Update session expiry
      if (req.session) {
        req.session.touch();
      }
      res.json({ message: "Session refreshed" });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Updated logout route with improved error handling and database pool protection
  app.post("/api/logout", (req, res) => {
    try {
      // First ensure the user is authenticated before attempting logout
      if (!req.isAuthenticated()) {
        return res.status(200).json({ message: "Not logged in" });
      }
      
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        
        // Safely destroy the session
        if (req.session) {
          req.session.destroy((err) => {
            if (err) {
              console.error("Session destruction error:", err);
              return res.status(500).json({ message: "Failed to clear session" });
            }
            // Clear the cookie
            res.clearCookie("connect.sid");
            return res.json({ message: "Logged out successfully" });
          });
        } else {
          // If no session exists, just return success
          res.clearCookie("connect.sid");
          return res.json({ message: "Logged out successfully" });
        }
      });
    } catch (err) {
      console.error("Unexpected logout error:", err);
      res.status(500).json({ message: "An unexpected error occurred during logout" });
    }
  });
  
  // Endpoint for exporting tasks as Excel file
  app.get("/api/backup/tasks", ensureAdmin, async (req, res) => {
    try {
      // Parse date range from query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      
      // Get all tasks within the date range
      const allTasks = await storage.getAllTasks();
      const users = Array.from((await storage.getUsers()).values());
      const projects = await storage.getProjects();
      
      // Get task creator usernames
      const tasksWithDetails = allTasks
        .filter(task => {
          const taskDate = new Date(task.createdAt);
          return taskDate >= startDate && taskDate <= endDate;
        })
        .map(task => {
          const user = users.find(u => u.id === task.userId);
          const project = projects.find(p => p.id === task.projectId);
          
          return {
            ID: task.id,
            Title: task.title,
            Description: task.description || "",
            Status: task.status,
            Author: user?.username || "Unknown",
            Team: user?.team || "Unknown",
            Project: project?.name || "No Project",
            CreatedAt: new Date(task.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            DueDate: task.dueDate ? new Date(task.dueDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : "",
            IsCoWork: task.isCoWork ? "Yes" : "No",
            IsArchived: task.isArchived ? "Yes" : "No"
          };
        });
      
      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(tasksWithDetails);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
      
      // Auto-size columns
      const colWidths = [
        { wch: 5 },  // ID
        { wch: 30 }, // Title
        { wch: 40 }, // Description
        { wch: 10 }, // Status
        { wch: 15 }, // Author
        { wch: 10 }, // Team
        { wch: 25 }, // Project
        { wch: 20 }, // CreatedAt
        { wch: 20 }, // DueDate
        { wch: 10 }, // IsCoWork
        { wch: 10 }  // IsArchived
      ];
      worksheet["!cols"] = colWidths;
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename=tasks_backup_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send Excel file to client
      res.send(excelBuffer);
    } catch (err) {
      console.error("Error generating backup:", err);
      res.status(500).json({ message: "Failed to generate backup file" });
    }
  });
  
  // Endpoint for deleting tasks by date range
  app.delete("/api/backup/tasks", ensureAdmin, async (req, res) => {
    try {
      // Parse date range from query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      
      // Get all tasks within the date range
      const allTasks = await storage.getAllTasks();
      
      const tasksToDelete = allTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= startDate && taskDate <= endDate;
      });
      
      // Delete tasks
      const deletePromises = tasksToDelete.map(task => storage.deleteTask(task.id));
      await Promise.all(deletePromises);
      
      res.json({ 
        message: "Tasks deleted successfully", 
        count: tasksToDelete.length 
      });
    } catch (err) {
      console.error("Error deleting tasks:", err);
      res.status(500).json({ message: "Failed to delete tasks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}