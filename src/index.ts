import "dotenv/config";
import app from "./bootstrap/app";
import { initializeDatabase } from "./bootstrap/database";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Swagger docs available at http://localhost:${port}/docs`);
    });
  } catch (error) {
    console.error("[startup] Server failed to start.", error);
    process.exit(1);
  }
}

void startServer();
