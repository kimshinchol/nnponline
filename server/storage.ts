import { InsertUser, User, Task, Project, InsertTask, InsertProject } from "@shared/schema";
import { users, tasks, projects } from "@shared/schema";
import { db } from "./db";
import { eq, sql, isNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { getpool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  approveUser(id: number): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

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
  deleteProject(id: number): Promise<void>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project>;

  sessionStore: session.Store;
  getUsers(): Promise<Map<number, User>>;
  getAllTasks(): Promise<Task[]>;

  createBackup(): Promise<BackupData>;
  restoreFromBackup(backup: BackupData): Promise<void>;
  archiveTasks(filters: ArchiveFilters): Promise<Task[]>;
  getArchivedTasks(filters?: ArchiveFilters): Promise<Task[]>;
}

interface BackupData {
  users: User[];
  tasks: Task[];
  projects: Project[];
  timestamp: Date;
}

interface ArchiveFilters {
  before?: Date;
  status?: string;
  projectId?: number;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool: getPool(),
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.id} = ${id} AND (${users.isDeleted} = false OR ${users.isDeleted} IS NULL)`);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.username} = ${username} AND (${users.isDeleted} = false OR ${users.isDeleted} IS NULL)`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.email} = ${email} AND (${users.isDeleted} = false OR ${users.isDeleted} IS NULL)`);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async approveUser(id: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isApproved: true,
        role: "user" // Set default role to "user" when approving
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Soft delete user
    await db
      .update(users)
      .set({
        isDeleted: true,
        deletedAt: new Date()
      })
      .where(eq(users.id, id));

    // Update username in tasks
    const user = await this.getUser(id);
    if (user) {
      await db
        .update(tasks)
        .set({ username: user.username })
        .where(eq(tasks.userId, id));
    }
  }

  async getUsers(): Promise<Map<number, User>> {
    const allUsers = await db
      .select()
      .from(users)
      .where(sql`${users.isDeleted} = false OR ${users.isDeleted} IS NULL`);
    return new Map(allUsers.map(user => [user.id, user]));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    // Get user and project info before creating task
    const [user] = await db.select().from(users).where(eq(users.id, insertTask.userId));
    const [project] = insertTask.projectId ?
      await db.select().from(projects).where(eq(projects.id, insertTask.projectId)) :
      [null];

    const taskData = {
      ...insertTask,
      username: user?.username,
      projectName: project?.name
    };

    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getUserTasks(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async getTeamTasks(team: string): Promise<Task[]> {
    const teamUsers = await db
      .select()
      .from(users)
      .where(sql`${users.team} = ${team} AND (${users.isDeleted} = false OR ${users.isDeleted} IS NULL)`);

    if (teamUsers.length === 0) return [];

    const userIds = teamUsers.map(user => user.id);
    // Include both personal and co-work tasks in team view
    return await db
      .select()
      .from(tasks)
      .where(sql`${tasks.userId} = ANY(${userIds}::int[]) AND ${tasks.isArchived} = false`);
  }

  async getProjectTasks(projectId: number): Promise<Task[]> {
    // Include both personal and co-work tasks in project view
    return await db
      .select()
      .from(tasks)
      .where(sql`${tasks.projectId} = ${projectId} AND ${tasks.isArchived} = false`);
  }

  async updateTaskStatus(id: number, status: string): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    // Get the current task first
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));

    // Preserve metadata when updating
    const updateData = {
      ...data,
      projectId: data.projectId || currentTask.projectId,
      projectName: data.projectId ?
        (await db.select().from(projects).where(eq(projects.id, data.projectId)))[0]?.name :
        currentTask.projectName,
      createdAt: currentTask.createdAt, // Preserve original creation date
      dueDate: data.dueDate || currentTask.dueDate,
      status: data.status || currentTask.status,
    };

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    return task;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async getProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(sql`${projects.isDeleted} = false OR ${projects.isDeleted} IS NULL`);
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async deleteProject(id: number): Promise<void> {
    // Soft delete project
    await db
      .update(projects)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      })
      .where(eq(projects.id, id));

    // Update project name in tasks
    const project = await db.select().from(projects).where(eq(projects.id, id));
    if (project.length > 0) {
      await db
        .update(tasks)
        .set({ projectName: project[0].name })
        .where(eq(tasks.projectId, id));
    }
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    // Update the project
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    // If name was updated, update project name in tasks
    if (updates.name) {
      await db
        .update(tasks)
        .set({ projectName: updates.name })
        .where(eq(tasks.projectId, id));
    }

    return project;
  }


  async createBackup(): Promise<BackupData> {
    const allUsers = await db.select().from(users);
    const allTasks = await db.select().from(tasks);
    const allProjects = await db.select().from(projects);

    return {
      users: allUsers,
      tasks: allTasks,
      projects: allProjects,
      timestamp: new Date(),
    };
  }

  async restoreFromBackup(backup: BackupData): Promise<void> {
    await db.delete(users);
    await db.delete(tasks);
    await db.delete(projects);

    if (backup.users.length) await db.insert(users).values(backup.users);
    if (backup.tasks.length) await db.insert(tasks).values(backup.tasks);
    if (backup.projects.length) await db.insert(projects).values(backup.projects);
  }

  async archiveTasks(filters: ArchiveFilters): Promise<Task[]> {
    console.log("Starting archive process with filters:", filters);

    let query = db.select().from(tasks);

    if (filters.before) {
      // Only archive tasks that are before the selected date AND not from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      query = query.where(sql`${tasks.createdAt} < ${filters.before} AND DATE(${tasks.createdAt}) != CURRENT_DATE`);
    }

    // Get tasks to archive
    const tasksToArchive = await query;
    console.log(`Found ${tasksToArchive.length} tasks to archive`);

    if (tasksToArchive.length > 0) {
      // Update tasks to be archived
      for (const task of tasksToArchive) {
        await db
          .update(tasks)
          .set({ isArchived: true })
          .where(eq(tasks.id, task.id))
          .returning();
        console.log(`Archived task ${task.id}: ${task.title}`);
      }
    }

    return tasksToArchive;
  }

  async getArchivedTasks(filters?: ArchiveFilters): Promise<Task[]> {
    console.log("Starting to fetch archived tasks");

    try {
      const query = db
        .select()
        .from(tasks)
        .where(eq(tasks.isArchived, true))
        .orderBy(sql`${tasks.createdAt} DESC`);

      const archivedTasks = await query;
      console.log(`Found ${archivedTasks.length} archived tasks:`, archivedTasks);

      return archivedTasks;
    } catch (error) {
      console.error("Error fetching archived tasks:", error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
