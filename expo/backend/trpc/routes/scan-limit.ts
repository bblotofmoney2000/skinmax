import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const scanRecords = new Map<string, { count: number; date: string }>();

const FREE_SCANS_PER_DAY = 1;

const getTodayUTC = (): string => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};

export const scanLimitRouter = createTRPCRouter({
  getStatus: publicProcedure
    .input(z.object({ deviceId: z.string().min(1) }))
    .query(({ input }) => {
      const today = getTodayUTC();
      const record = scanRecords.get(input.deviceId);

      if (!record || record.date !== today) {
        return { scanCount: 0, canScan: true, remaining: FREE_SCANS_PER_DAY };
      }

      const remaining = Math.max(0, FREE_SCANS_PER_DAY - record.count);
      return { scanCount: record.count, canScan: remaining > 0, remaining };
    }),

  recordScan: publicProcedure
    .input(z.object({ deviceId: z.string().min(1) }))
    .mutation(({ input }) => {
      const today = getTodayUTC();
      const record = scanRecords.get(input.deviceId);

      if (!record || record.date !== today) {
        scanRecords.set(input.deviceId, { count: 1, date: today });
        return { success: true, scanCount: 1, remaining: FREE_SCANS_PER_DAY - 1 };
      }

      if (record.count >= FREE_SCANS_PER_DAY) {
        return { success: false, scanCount: record.count, remaining: 0 };
      }

      record.count += 1;
      scanRecords.set(input.deviceId, record);
      const remaining = Math.max(0, FREE_SCANS_PER_DAY - record.count);
      return { success: true, scanCount: record.count, remaining };
    }),
});
