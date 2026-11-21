FROM oven/bun:1.4.5 AS dependencies
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY next.config.ts next-env.d.ts tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
COPY data ./data
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM dependencies AS maintenance
COPY src ./src
COPY drizzle ./drizzle
COPY data ./data
USER bun
CMD ["bun", "run", "db:retention:scheduler"]

FROM oven/bun:1.4.5 AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=bun:bun /app/.next/standalone ./
COPY --from=build --chown=bun:bun /app/.next/static ./.next/static
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
