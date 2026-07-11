import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { put } from "@vercel/blob";

const archives = ["dish-submissions.zip", "menus.zip"];
const sourceDirectory = resolve(process.env.BLOB_BACKUP_DIRECTORY ?? "../postgres_backups");
const access = process.argv.includes("--private") ? "private" : "public";
const outputPath = resolve("data/blob-storage-migration.json");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is missing from .env.local.");
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile()) files.push(path);
  }

  return files;
}

const extractionDirectory = await mkdtemp(join(tmpdir(), "food-for-thought-blob-"));

try {
  for (const archive of archives) {
    const archivePath = join(sourceDirectory, archive);
    try {
      await stat(archivePath);
    } catch {
      throw new Error(`Could not find ${archivePath}`);
    }
    execFileSync("tar", ["-xf", archivePath, "-C", extractionDirectory], { stdio: "inherit" });
  }

  const files = await filesIn(extractionDirectory);
  const manifest = [];

  console.log(`Uploading ${files.length} files to the ${access} Blob store...`);

  for (const [index, filePath] of files.entries()) {
    // The archive already begins with dish-submissions/ or menus/. Keeping this
    // pathname makes existing image_path/image_paths values remain valid.
    const pathname = relative(extractionDirectory, filePath).replaceAll("\\", "/");
    const blob = await put(pathname, await readFile(filePath), {
      access,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    manifest.push({ pathname, url: blob.url });
    console.log(`[${index + 1}/${files.length}] ${pathname}`);
  }

  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Done. Wrote ${basename(outputPath)} with ${manifest.length} Blob URLs.`);
} finally {
  await rm(extractionDirectory, { recursive: true, force: true });
}
