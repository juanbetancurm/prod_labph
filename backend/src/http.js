export class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function requireBodyFields(body, fields) {
  const missing = fields.filter((field) => body[field] == null || body[field] === "");

  if (missing.length) {
    throw new HttpError(400, `Missing required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  }
}

export function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

export function optionalDecimal(value) {
  if (value == null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new HttpError(400, "Quantity values must be numeric when provided.");
  }

  return number;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}
