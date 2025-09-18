import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  migrations: {
    seed: 'ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts'
  },
  schema: './prisma/schema.prisma'
})