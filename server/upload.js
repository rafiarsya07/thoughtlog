// ---------------------------------------------------------------------------
// upload.js — Image upload handling (multer, disk storage)
//
// Files land in server/uploads/, named with a random hex prefix so two
// uploads with the same original filename never collide. Only image
// mimetypes are accepted, capped at 5MB. The route that uses this just
// needs the returned public URL — everything else (validation, naming,
// folder creation) lives here.
// ---------------------------------------------------------------------------

import multer from "multer";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync } from "fs";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = join(__dirname, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = extname(file.originalname).toLowerCase().slice(0, 6);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed"));
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
