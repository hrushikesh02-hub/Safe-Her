console.log("UPLOAD FILE LOADED");
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary";

console.log(cloudinary.config());

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "safeher-profile",
    allowed_formats: ["jpg", "jpeg", "png"],
  } as any,
});

export const upload = multer({
    storage,
});