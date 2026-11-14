import { env } from "@/config/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Importing the validated config here makes invalid deployment settings fail at startup.
    void env;
  }
}
