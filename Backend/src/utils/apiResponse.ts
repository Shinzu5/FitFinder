import { Response } from "express";

export function sendSuccess(
  res: Response,
  data: any = null,
  message = "Success",
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = "Something went wrong",
  statusCode = 400,
  errors: any = null
) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export function sendCreated(
  res: Response,
  data: any = null,
  message = "Created successfully"
) {
  return sendSuccess(res, data, message, 201);
}
