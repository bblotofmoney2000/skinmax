import { createTRPCRouter } from "./create-context";
import { scanLimitRouter } from "./routes/scan-limit";

export const appRouter = createTRPCRouter({
  scanLimit: scanLimitRouter,
});

export type AppRouter = typeof appRouter;
