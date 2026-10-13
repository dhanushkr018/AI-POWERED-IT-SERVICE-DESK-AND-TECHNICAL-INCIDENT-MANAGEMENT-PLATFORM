import { ZodError } from "zod";
import { HttpError } from "../errors.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: "That API route does not exist." });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Some fields need attention.",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof SyntaxError && error.status === 400) {
    res.status(400).json({ error: "The request body must be valid JSON." });
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) {
    console.error(error.message);
  }

  res.status(status).json({
    error: status >= 500 ? "Something went wrong. Please try again." : error.message,
    details: status >= 500 ? undefined : error.details,
  });
}
