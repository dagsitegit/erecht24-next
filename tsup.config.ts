import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/util.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  external: ["next", "react", "react/jsx-runtime", "server-only"],
})
