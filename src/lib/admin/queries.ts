export const ADMIN_DAILY_TRAFFIC_QUERY =
  `select day,sum(page_views)::bigint page_views from platform_daily_traffic where day>=current_date-13 group by day order by day`;

export const ADMIN_DAILY_VISITORS_QUERY =
  `select day,count(*)::bigint unique_visitors from platform_daily_visitors where day>=current_date-13 group by day order by day`;

export const ADMIN_DAILY_SIGNUPS_QUERY =
  `select "createdAt"::date as signup_day,count(*)::bigint signups from "user" where "createdAt">=current_date-13 group by "createdAt"::date order by signup_day`;
