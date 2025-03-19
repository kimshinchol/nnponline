import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { Server } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add comprehensive error logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  let retries = 5;
  let server: Server | undefined;

  const startServer = async (): Promise<boolean> => {
    try {
      // Test database connection
      await pool.connect();
      console.log('Database connection successful');

      server = await registerRoutes(app);

      // Enhanced error handling middleware
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Server error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
      });

      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      const port = parseInt(process.env.PORT || "5000", 10);
      server.listen(port, "0.0.0.0", () => {
        log(`Server running on port ${port}`);
      });

      return true;
    } catch (err) {
      console.error("Server startup error:", err);
      return false;
    }
  };

  while (retries > 0) {
    const success = await startServer();
    if (success) {
      // Graceful shutdown handling
      process.on('SIGTERM', () => {
        console.log('SIGTERM received. Starting graceful shutdown...');
        if (server) {
          server.close(() => {
            console.log('Server closed. Shutting down pool...');
            pool.end().then(() => {
              console.log('Pool has ended. Process will now exit.');
              process.exit(0);
            });
          });
        } else {
          process.exit(1);
        }
      });

      // Successfully started server
      break;
    }

    retries--;
    if (retries === 0) {
      console.error("Failed to start server after multiple attempts");
      process.exit(1);
    }

    console.log(`Retrying server startup in 5 seconds... (${retries} attempts remaining)`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
})();