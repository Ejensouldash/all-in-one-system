import { register } from "node:module"
import { pathToFileURL } from "node:url"

register(new URL("./ts-resolver.mjs", import.meta.url).href, pathToFileURL("./"))
