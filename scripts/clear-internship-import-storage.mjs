import { createClient } from "@supabase/supabase-js";

const bucketName = "internship-imports";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
}

if (process.env.CONFIRM_CLEAR_IMPORT_STORAGE !== bucketName) {
  throw new Error(`Set CONFIRM_CLEAR_IMPORT_STORAGE=${bucketName} to confirm deleting objects in this bucket.`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function listFiles(path = "") {
  const entries = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    entries.push(...(data ?? []));
    if (!data || data.length < limit) break;
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files.push(...await listFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

const paths = await listFiles();
if (!paths.length) {
  console.log(`Bucket "${bucketName}" is already empty.`);
  process.exit(0);
}

for (let index = 0; index < paths.length; index += 100) {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove(paths.slice(index, index + 100));
  if (error) throw error;
}

console.log(`Deleted ${paths.length} object(s) from bucket "${bucketName}" through the Storage API.`);
