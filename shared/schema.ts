import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  team: text("team").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  isApproved: boolean("is_approved").notNull().default(false),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("작업전"),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
});

// Update session table with correct types
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).extend({
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    "Password must contain uppercase, lowercase, number and special character"
  ),
  team: z.enum(["PM", "CM", "CC", "AT", "MT"]),
});

export const insertProjectSchema = createInsertSchema(projects);

export const insertTaskSchema = createInsertSchema(tasks).extend({
  status: z.enum(["작업전", "작업중", "완료"]).default("작업전"),
  description: z.string().nullable().optional(),
  projectId: z.number({ required_error: "Project is required" }), 
  userId: z.number().optional(),
  dueDate: z.date().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;