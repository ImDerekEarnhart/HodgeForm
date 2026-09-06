import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
export async function resolve(specifier,context,nextResolve) {
  if(specifier.startsWith("@/")||specifier.startsWith(".")) {
    const path=specifier.startsWith("@/")?resolvePath(root,"src",specifier.slice(2)):context.parentURL?.startsWith("file:")?resolvePath(dirname(fileURLToPath(context.parentURL)),specifier):null;
    if(path)for(const extension of [".ts",".tsx","/index.ts"])if(existsSync(path+extension))return nextResolve(pathToFileURL(path+extension).href,context);
  }
  return nextResolve(specifier,context);
}
