import { PrismaClient } from "@prisma/client";
import { NODE_ENV } from "utils/envs";

/**
 * Cleanups database
 */
export const cleanupDatabase = async (): Promise<void> => {
  if (NODE_ENV === "test") {
    // Cleanup is allowed only in the test environment
    const prisma = new PrismaClient();
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  }
};
