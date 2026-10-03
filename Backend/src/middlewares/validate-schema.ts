/**
 * Reference-style Zod guard: validates `{ body, query, params }` together.
 * Returns `400` with `{ success: false, errors: [{ path, message }] }`.
 * Existing body-only `validate()` in `./validate` is kept for compatibility.
 */
import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

export const validateSchema = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed && typeof parsed === "object" && "body" in (parsed as object)) {
        req.body = (parsed as { body: unknown }).body;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
