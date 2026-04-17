import "dotenv/config";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET || "production";

if (!projectId) {
  console.warn(
    "[studio] Set SANITY_STUDIO_PROJECT_ID (and optionally SANITY_STUDIO_DATASET) in site/studio/.env — mirror IDs in site/.env for Astro (PUBLIC_*)."
  );
}

export default defineConfig({
  name: "flissinging",
  title: "Fliss Singing",
  projectId: projectId || "missing-project-id",
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes }
});
