import { spawnSync } from "node:child_process"

if (process.env.SKIP_PRISMA_MIGRATE_DEPLOY === "1") {
  console.log("Skipping prisma migrate deploy because SKIP_PRISMA_MIGRATE_DEPLOY=1")
  process.exit(0)
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
})

if (typeof result.status === "number") {
  process.exit(result.status)
}

process.exit(1)
