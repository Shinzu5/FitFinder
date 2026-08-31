import { Router } from "express";
import { uploadImage } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

router.post("/image", authenticate, upload.single("image"), uploadImage);

export default router;
