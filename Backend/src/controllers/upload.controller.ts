import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/apiResponse";

// POST /api/upload/image
export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, "No file uploaded");
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

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
