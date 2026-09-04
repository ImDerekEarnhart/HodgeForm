import { publicReleaseConfig } from "@/lib/gate/config.server";
import { getSql } from "@/lib/db";

export type ReadinessResult = {
  ready: boolean;
  release: string;
  checks: { config: "ok" | "fail"; database: "ok" | "fail" };
  issues: string[];
};

export async function readinessStatus(): Promise<ReadinessResult> {
  const config = publicReleaseConfig();
  const issues = [...config.issues];
  let database: "ok" | "fail" = "ok";
  try {
    const sql = await getSql();
    await sql.query("select 1 as ok");
  } catch {
    database = "fail";
    issues.push("database connectivity check failed");
  }
  return {
    ready: (!config.publicRelease || config.ready) && database === "ok",
    release: "1.1.0",
    checks: { config: config.ready || !config.publicRelease ? "ok" : "fail", database },
    issues,
  };
}
