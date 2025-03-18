import { InsertUser, User, Task, Project, InsertTask, InsertProject } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Define backup data structure
interface BackupData {
  users: User[];
  tasks: Task[];
  projects: Project[];
  timestamp: Date;
}

// Define archive filters
interface ArchiveFilters {
  before?: Date;
  status?: string;
  projectId?: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  approveUser(id: number): Promise<User>;

  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getUserTasks(userId: number): Promise<Task[]>;
  getTeamTasks(team: string): Promise<Task[]>;
  getProjectTasks(projectId: number): Promise<Task[]>;
  updateTaskStatus(id: number, status: string): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  updateTask(id: number, data: Partial<Task>): Promise<Task>;

  createProject(project: InsertProject): Promise<Project>;
  getProjects(): Promise<Project[]>;

  // New backup and archive methods
  createBackup(): Promise<BackupData>;
  restoreFromBackup(backup: BackupData): Promise<void>;
  archiveTasks(filters: ArchiveFilters): Promise<Task[]>;
  getArchivedTasks(filters?: ArchiveFilters): Promise<Task[]>;

  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private projects: Map<number, Project>;
  private archivedTasks: Map<number, Task>;
  public sessionStore: session.Store;
  private currentId: { users: number; tasks: number; projects: number };

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.projects = new Map();
    this.archivedTasks = new Map();
    this.currentId = { users: 1, tasks: 1, projects: 1 };
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = {
      ...insertUser,
      id,
      isAdmin: insertUser.isAdmin ?? false,
      isApproved: insertUser.isApproved ?? false,
    };
    this.users.set(id, user);
    return user;
  }

  async approveUser(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, isApproved: true };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId.tasks++;
    const newTask: Task = {
      ...task,
      id,
      description: task.description ?? null,
      projectId: task.projectId ?? null,
      dueDate: task.dueDate ?? null,
      createdAt: task.createdAt ?? new Date(),
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getUserTasks(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  async getTeamTasks(team: string): Promise<Task[]> {
    const teamUsers = Array.from(this.users.values()).filter(
      (user) => user.team === team,
    );
    return Array.from(this.tasks.values()).filter((task) =>
      teamUsers.some((user) => user.id === task.userId),
    );
  }

  async getProjectTasks(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId,
    );
  }

  async updateTaskStatus(id: number, status: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    const updatedTask = { ...task, status };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");

    const updatedTask = {
      ...task,
      ...data,
      id, // Ensure ID remains unchanged
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentId.projects++;
    const newProject: Project = {
      ...project,
      id,
      createdAt: project.createdAt ?? new Date(),
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createBackup(): Promise<BackupData> {
    return {
      users: Array.from(this.users.values()),
      tasks: Array.from(this.tasks.values()),
      projects: Array.from(this.projects.values()),
      timestamp: new Date(),
    };
  }

  async restoreFromBackup(backup: BackupData): Promise<void> {
    // Clear existing data
    this.users.clear();
    this.tasks.clear();
    this.projects.clear();

    // Restore from backup
    backup.users.forEach((user) => this.users.set(user.id, user));
    backup.tasks.forEach((task) => this.tasks.set(task.id, task));
    backup.projects.forEach((project) => this.projects.set(project.id, project));

    // Update currentId to be higher than any existing ID
    this.currentId = {
      users: Math.max(...backup.users.map((u) => u.id), 0) + 1,
      tasks: Math.max(...backup.tasks.map((t) => t.id), 0) + 1,
      projects: Math.max(...backup.projects.map((p) => p.id), 0) + 1,
    };
  }

  async archiveTasks(filters: ArchiveFilters): Promise<Task[]> {
    const tasksToArchive = Array.from(this.tasks.values()).filter((task) => {
      if (filters.before && new Date(task.createdAt) > filters.before) {
        return false;
      }
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.projectId && task.projectId !== filters.projectId) {
        return false;
      }
      return true;
    });

    // Move tasks to archive
    tasksToArchive.forEach((task) => {
      this.tasks.delete(task.id);
      this.archivedTasks.set(task.id, task);
    });

    return tasksToArchive;
  }

  async getArchivedTasks(filters?: ArchiveFilters): Promise<Task[]> {
    let archivedTasks = Array.from(this.archivedTasks.values());

    if (filters) {
      archivedTasks = archivedTasks.filter((task) => {
        if (filters.before && new Date(task.createdAt) > filters.before) {
          return false;
        }
        if (filters.status && task.status !== filters.status) {
          return false;
        }
        if (filters.projectId && task.projectId !== filters.projectId) {
          return false;
        }
        return true;
      });
    }

    return archivedTasks;
  }
}

export const storage = new MemStorage();