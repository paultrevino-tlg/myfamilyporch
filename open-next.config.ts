import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Add R2 incremental cache / KV queue here as the app grows.
});
