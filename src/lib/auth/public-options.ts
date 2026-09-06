import { createServerFn } from "@tanstack/react-start";

// Only public UI options cross this boundary; credentials remain server-side.
export const getPublicAuthOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { emailAndPasswordEnabled, signupsAllowed, minPasswordLength } = await import("./email-password");
  return { emailAndPasswordEnabled, signupsAllowed, minPasswordLength };
});
