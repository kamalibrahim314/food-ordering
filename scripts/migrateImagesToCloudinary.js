import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(apiDir, "..");

// Load environment variables from api/.env
dotenv.config({ path: path.join(apiDir, ".env") });

import { connectDB, sequelize } from "../src/DB/DBConnection.js";
import Category from "../src/DB/models/Category.js";
import Dish from "../src/DB/models/Dish.js";
import Restaurant from "../src/DB/models/Restaurant.js";
import User from "../src/DB/models/User.js";
import { uploadFileToCloudinary } from "../src/utils/cloudinary.js";

const isDryRun = process.argv.includes("--dry-run");
const isFilesOnly = process.argv.includes("--files-only");

/**
 * Searches common upload directories for a local image file.
 */
const findLocalFile = (rawPath, subfolder) => {
  if (!rawPath || typeof rawPath !== "string") return null;

  // Clean path of URL protocols and query parameters if present
  let clean = rawPath.replace(/^https?:\/\/[^\/]+\//i, "").split("?")[0];
  const filename = path.basename(clean);

  const candidatePaths = [
    // 1. Direct path from API directory
    path.resolve(apiDir, clean),
    // 2. Direct path from project root
    path.resolve(rootDir, clean),
    // 3. Inside api/uploads/<subfolder>/<filename>
    path.resolve(apiDir, "uploads", subfolder, filename),
    // 4. Inside api/uploads/<clean>
    path.resolve(apiDir, "uploads", clean.replace(/^uploads[\/\\]/i, "")),
    // 5. Inside project root uploads/<subfolder>/<filename>
    path.resolve(rootDir, "uploads", subfolder, filename),
    // 6. Inside api/uploads/<filename>
    path.resolve(apiDir, "uploads", filename),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
};

/**
 * Checks if a value is already a migrated remote cloud URL (not a local URL)
 */
const isAlreadyMigratedUrl = (val) => {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const isLocalhost = trimmed.includes("localhost") || trimmed.includes("127.0.0.1");
  return isHttp && !isLocalhost;
};

/**
 * Migrates local uploads folder directly without database connection (for testing/batch upload)
 */
const runFilesOnlyMigration = async () => {
  console.log(`\n📂 Scanning local "uploads" folder for direct Cloudinary upload...`);
  const uploadsBase = path.resolve(apiDir, "uploads");

  if (!fs.existsSync(uploadsBase)) {
    console.error(`❌ Uploads directory not found at: ${uploadsBase}`);
    process.exit(1);
  }

  const subfolders = ["categories", "dishes", "restaurants"];
  const summary = { uploaded: 0, failed: 0, skipped: 0 };
  const mapping = {};

  for (const subfolder of subfolders) {
    const dir = path.join(uploadsBase, subfolder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile());
    console.log(`\n📁 Uploading ${files.length} file(s) from "${subfolder}" to Cloudinary (folder: food-ordering/${subfolder})...`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      if (isDryRun) {
        console.log(`  [DRY-RUN] Would upload: ${file}`);
        summary.uploaded++;
        continue;
      }

      try {
        const result = await uploadFileToCloudinary(filePath, {
          folder: subfolder,
          use_filename: true,
          unique_filename: false,
        });
        mapping[`uploads/${subfolder}/${file}`] = result.secure_url;
        summary.uploaded++;
        console.log(`  ✅ ${file} -> ${result.secure_url}`);
      } catch (err) {
        summary.failed++;
        console.error(`  ❌ Failed to upload ${file}:`, err.message);
      }
    }
  }

  console.log(`\n========================================================================`);
  console.log(`📊 DIRECT UPLOAD SUMMARY`);
  console.log(`========================================================================`);
  console.table(summary);
  console.log(`✨ Direct file upload completed.`);
  process.exit(0);
};

/**
 * Migrates a specific model's image field to Cloudinary
 */
const migrateModel = async (config) => {
  const { model, name, field, folder } = config;
  console.log(`\n==================================================`);
  console.log(`🔍 Inspecting ${name} (${field}) for migration...`);
  console.log(`==================================================`);

  const summary = {
    total: 0,
    alreadyMigrated: 0,
    empty: 0,
    uploaded: 0,
    failed: 0,
  };

  try {
    const records = await model.findAll();
    summary.total = records.length;

    for (const record of records) {
      // Access raw value directly from dataValues to avoid getter formatting
      const rawValue = record.getDataValue(field);

      if (!rawValue || typeof rawValue !== "string" || !rawValue.trim()) {
        summary.empty++;
        continue;
      }

      // Check if it's already a full remote URL (Cloudinary, AWS S3, etc.)
      if (isAlreadyMigratedUrl(rawValue)) {
        summary.alreadyMigrated++;
        console.log(`  [${name} #${record.id}] ⏩ Skipped (already remote): ${rawValue}`);
        continue;
      }

      // Find local file on disk
      const localFilePath = findLocalFile(rawValue, folder);

      if (!localFilePath) {
        summary.failed++;
        console.warn(`  [${name} #${record.id}] ⚠️ Local file not found for: "${rawValue}"`);
        continue;
      }

      console.log(`  [${name} #${record.id}] ⬆️ Found: ${localFilePath}`);

      if (isDryRun) {
        console.log(`  [${name} #${record.id}] [DRY-RUN] Would upload to food-ordering/${folder}`);
        summary.uploaded++;
        continue;
      }

      try {
        const uploadResult = await uploadFileToCloudinary(localFilePath, {
          folder,
          use_filename: true,
          unique_filename: true,
        });

        const newUrl = uploadResult.secure_url;

        // Update database record
        await model.update(
          { [field]: newUrl },
          { where: { id: record.id } }
        );

        summary.uploaded++;
        console.log(`  [${name} #${record.id}] ✅ Successfully migrated -> ${newUrl}`);
      } catch (err) {
        summary.failed++;
        console.error(`  [${name} #${record.id}] ❌ Cloudinary upload error:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error querying ${name}:`, err.message);
  }

  return summary;
};

const runMigration = async () => {
  console.log(`🚀 Starting Cloudinary Image Migration...`);
  if (isDryRun) {
    console.log(`⚠️ RUNNING IN DRY-RUN MODE (no files will be uploaded, no DB updates)`);
  }

  // 1. Check Cloudinary Configuration
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinaryCloudName;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.cloudinaryApiKey;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.cloudinaryApiSecret;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(`❌ Cloudinary environment variables missing! Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in api/.env.`);
    process.exit(1);
  }

  console.log(`🔑 Cloudinary Config: Cloud Name = "${cloudName}", API Key = "${apiKey.substring(0, 4)}..."`);

  if (isFilesOnly) {
    await runFilesOnlyMigration();
    return;
  }

  // 2. Connect to MySQL Database
  try {
    await connectDB();
    console.log(`🔌 Database connected successfully.`);
  } catch (err) {
    console.error(`❌ Database connection failed. Please ensure MySQL is running:`, err.message);
    process.exit(1);
  }

  // 3. Models to migrate
  const targets = [
    { model: Category, name: "Categories", field: "image", folder: "categories" },
    { model: Dish, name: "Dishes", field: "image", folder: "dishes" },
    { model: Restaurant, name: "Restaurants", field: "logo", folder: "restaurants" },
    { model: User, name: "Users", field: "profile_image", folder: "users" },
  ];

  const overallSummaries = {};

  for (const target of targets) {
    overallSummaries[target.name] = await migrateModel(target);
  }

  // 4. Print Summary Table
  console.log(`\n`);
  console.log(`========================================================================`);
  console.log(`📊 CLOUDINARY MIGRATION FINAL SUMMARY`);
  console.log(`========================================================================`);
  console.table(overallSummaries);
  console.log(`========================================================================`);
  console.log(`✨ Migration finished! All migrated records now point directly to Cloudinary.`);
  console.log(`========================================================================\n`);

  await sequelize.close();
  process.exit(0);
};

runMigration().catch((err) => {
  console.error("Fatal error during migration:", err);
  process.exit(1);
});
