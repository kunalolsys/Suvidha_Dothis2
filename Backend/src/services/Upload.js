import multer from "multer";
import path from "path";
import fs from "fs";

const getDestination = (file) => {
  switch (file.fieldname) {
    case "logo":
      return "uploads/companies/logos";

    case "favicon":
      return "uploads/companies/favicons";

    case "profilePhoto":
      return "uploads/users/profiles";

    case "file": // 🚀 CSV & Bulk Import Files
    case "csv":
      return "uploads/csv";

    default:
      return "uploads/misc";
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = getDestination(file);

    // Auto-create directory if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    // Image Mimetypes
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",

    // 🚀 CSV Mimetypes (Added for User Bulk Import)
    "text/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "text/x-csv",
    "application/csv",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Allowed: Images and CSV files."),
      false,
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 🟢 Increased to 10MB to handle large CSV imports
  },
});

export default upload;
