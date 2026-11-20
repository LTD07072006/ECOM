import { z } from "zod";

const databaseUrl = z.url({ protocol: /^postgres(?:ql)?$/ });

export const env = {
  get DATABASE_URL() {
    const parsed = databaseUrl.safeParse(process.env.DATABASE_URL);
    if (!parsed.success) throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL.");
    return parsed.data;
  },
};
