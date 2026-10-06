import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const leaderboardRouter = createTRPCRouter({
  top: publicProcedure.query(({ ctx }) => {
    return ctx.db.$queryRaw<
      Array<{ id: number; name: string; value: number; createdAt: Date }>
    >`
      SELECT id, name, value, createdAt
      FROM Score
      ORDER BY value DESC, createdAt ASC
      LIMIT 5
    `;
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(12),
        score: z.number().int().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$executeRaw`
        INSERT INTO Score (name, value)
        VALUES (${input.name}, ${input.score})
      `;

      return {
        name: input.name,
        value: input.score,
      };
    }),
});
