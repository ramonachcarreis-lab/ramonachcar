import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import os from "os";
import { registerNotificationRoutes } from "./server/notificationRoutes";
import { registerSignatureRoutes } from "./server/signatureRoutes";
import { registerMapsRoutes } from "./server/mapsRoutes";
import { registerFieldRoutes } from "./server/fieldRoutes";
import { registerLoyaltyRoutes } from "./server/loyaltyRoutes";
import { registerApiErrorMiddleware } from "./server/apiErrorMiddleware";

function getLanUrls(port: number): string[] {
  const urls: string[] = [];
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === "IPv4" && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  return urls;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "15mb" }));

  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS || process.env.APP_URL || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const allowNetlifyApps =
    process.env.ALLOW_NETLIFY_CORS === "true" ||
    [...allowedOrigins].some((o) => o.includes("netlify.app"));
  if (allowedOrigins.size > 0 || allowNetlifyApps) {
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      const okOrigin =
        origin &&
        (allowedOrigins.has(origin) ||
          (allowNetlifyApps && /\.netlify\.app$/i.test(origin)));
      if (okOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });
  }

  registerNotificationRoutes(app);
  registerSignatureRoutes(app);
  registerMapsRoutes(app);
  registerFieldRoutes(app);
  registerLoyaltyRoutes(app);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  registerApiErrorMiddleware(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const lan = getLanUrls(PORT).filter((u) => !u.includes("169.254."));
    if (lan.length) {
      console.log("No celular (mesma Wi-Fi), abra:");
      lan.forEach((u) => console.log(`  → ${u}`));
    } else {
      console.log("Conecte o PC ao Wi-Fi para ver o link do celular aqui.");
    }
  });
}

startServer();
