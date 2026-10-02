import { Router } from "express";
import { uploadImage } from "../controllers/upload.controller";
import { authenticate } from "../middlewares/auth-middleware";
import { upload } from "../middlewares/upload";

const router = Router();

router.post("/image", authenticate, upload.single("image"), uploadImage);

export default router;
