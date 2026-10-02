import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { publicUrlFor } from "../services/upload/storage.service";

// POST /api/upload/image — local disk (ephemeral on Render, see storage.service.ts)
export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, "No file uploaded");
      return;
    }

    const fileUrl = publicUrlFor(req.file.filename);

    sendSuccess(res, {
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    }, "File uploaded");
  } catch (error) {
    console.error("Upload error:", error);
    sendError(res, "Failed to upload file", 500);
  }
}
