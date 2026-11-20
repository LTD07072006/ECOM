FROM oven/bun:1.4.5

WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY next.config.ts next-env.d.ts tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY drizzle ./drizzle
COPY data/sprint1 ./data/sprint1
COPY data/sprint3 ./data/sprint3

EXPOSE 3000
CMD ["bun", "run", "dev"]
