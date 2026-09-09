import path from "node:path"
import { pathToFileURL } from "node:url"

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: "data:text/javascript,export default {}",
      format: "module",
      shortCircuit: true,
    }
  }
  let target = specifier
  if (target.startsWith("@/")) {
    target = pathToFileURL(path.resolve(process.cwd(), "src", target.slice(2))).href
  }
  try {
    return await nextResolve(target, context)
  } catch (err) {
    if (!target.endsWith(".ts")) {
      try {
        return await nextResolve(target + ".ts", context)
      } catch {}
    }
    throw err
  }
}
