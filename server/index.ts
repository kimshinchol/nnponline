import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { Server } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Circuit breaker state
let isCircuitOpen = false;
let lastFailureTime = 0;
const CIRCUIT_RESET_TIMEOUT = 30000; // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 3;
let consecutiveFailures = 0;

// Add idle timeout configuration
const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let lastActivityTimestamp = Date.now();

// Activity tracking middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  lastActivityTimestamp = Date.now();
  next();
});

// Idle check interval
setInterval(() => {
  const idleTime = Date.now() - lastActivityTimestamp;
  if (idleTime >= IDLE_TIMEOUT) {
    log('Application idle timeout reached, preparing for shutdown');
    // Gracefully close database connections
    pool.end().then(() => {
      log('Database connections closed, application can safely sleep');
    }).catch(err => {
      console.error('Error closing database connections:', err);
    });
    process.exit(0); // Exit after closing connections
  }
}, 60000); // Check every minute


// Connection health check middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Skip health check endpoint to prevent infinite loop
  if (req.path === '/health') {
    return next();
  }

  // Check if circuit is open
  if (isCircuitOpen) {
    const now = Date.now();
    if (now - lastFailureTime > CIRCUIT_RESET_TIMEOUT) {
      // Try to reset circuit
      isCircuitOpen = false;
      consecutiveFailures = 0;
      log('Circuit breaker reset, attempting to restore service');
    } else {
      log('Circuit breaker is open, rejecting request');
      return res.status(503).json({ 
        message: "Service temporarily unavailable, please try again later",
        retryAfter: Math.ceil((CIRCUIT_RESET_TIMEOUT - (now - lastFailureTime)) / 1000)
      });
    }
  }

  try {
    // Test database connection
    const client = await pool.connect();
    client.release();
    consecutiveFailures = 0;
    next();
  } catch (err) {
    consecutiveFailures++;
    log(`Database connection failed, consecutive failures: ${consecutiveFailures}`);

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      isCircuitOpen = true;
      lastFailureTime = Date.now();
      log('Circuit breaker opened due to multiple consecutive failures');
    }

    res.status(503).json({ 
      message: "Service temporarily unavailable, please try again later",
      retryAfter: 30
    });
  }
});

// Add activity logging
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
      log("Starting server initialization...");

      // Test database connection with retry logic
      log("Testing database connection...");
      let connected = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!connected && attempts < maxAttempts) {
        try {
          const client = await pool.connect();
          client.release();
          connected = true;
          log('Database connection successful');
        } catch (err) {
          attempts++;
          log(`Database connection attempt ${attempts} failed: ${err}`);
          if (attempts < maxAttempts) {
            log('Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      if (!connected) {
        throw new Error('Failed to establish database connection after multiple attempts');
      }

      log("Registering routes...");
      server = await registerRoutes(app);
      log("Routes registered successfully");

      // Enhanced error handling middleware
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        console.error('Server error:', err);
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
      });

      log("Setting up server environment...");
      if (app.get("env") === "development") {
        await setupVite(app, server);
        log("Vite development server setup complete");
      } else {
        serveStatic(app);
        log("Static file serving setup complete");
      }

      // ALWAYS serve the app on port 5000 for Replit deployment
      return new Promise((resolve) => {
        log("Attempting to bind to port 5000...");
        server?.listen(5000, "0.0.0.0", () => {
          log(`Server running on port 5000`);
          resolve(true);
        });
      });
    } catch (err) {
      console.error("Server startup error:", err);
      return false;
    }
  };

  while (retries > 0) {
    const success = await startServer();
    if (success) {
      // Enhance graceful shutdown
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