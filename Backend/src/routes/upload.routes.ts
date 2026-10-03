import { Router } from "express";
import UploadController from "@/controllers/upload.controller";
import { authenticate } from "@/middlewares/auth";
import { upload } from "@/middlewares/upload";

const router = Router();

router.post("/image", authenticate, upload.single("image"), UploadController.uploadImage);

export default router;
