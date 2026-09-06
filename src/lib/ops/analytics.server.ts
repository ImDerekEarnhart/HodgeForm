import { createHmac } from "node:crypto";
import { getSql } from "@/lib/db";
import { publicTrafficGroup } from "@/lib/admin/policy";

let cleanupDay = "";

export async function recordPublicPageView(request: Request) {
  if (request.method !== "GET") return;
  const group = publicTrafficGroup(new URL(request.url).pathname);
  if (!group) return;
  const day = new Date().toISOString().slice(0, 10);
  const address = (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const agent = (request.headers.get("user-agent") ?? "unknown").slice(0, 300);
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return;
  const visitorHash = createHmac("sha256", secret).update(`${day}\0${address}\0${agent}`).digest("hex");
  const sql = await getSql();
  await Promise.all([
    sql.query(`insert into platform_daily_traffic(day,route_group,page_views) values($1,$2,1) on conflict(day,route_group) do update set page_views=platform_daily_traffic.page_views+1`, [day, group]),
    sql.query(`insert into platform_daily_visitors(day,visitor_hash) values($1,$2) on conflict(day,visitor_hash) do nothing`, [day, visitorHash]),
  ]);
  if (cleanupDay !== day) {
    cleanupDay = day;
    const retention = Math.max(1, Math.min(365, Number(process.env.HODGEFORM_DATA_RETENTION_DAYS ?? "30") || 30));
    await Promise.all([
      sql.query(`delete from platform_daily_visitors where day < current_date - $1::integer`, [retention]),
      sql.query(`delete from platform_daily_traffic where day < current_date - $1::integer`, [retention]),
    ]);
  }
}
