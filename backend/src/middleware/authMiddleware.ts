import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };

    file?: Express.Multer.File;
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query?.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      id: string;
      role: string;
    };

    req.user = decoded;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid token.",
    });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  const normalizedRoles = roles.map((r) => r.toLowerCase().trim());
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userRole = (req.user.role || "").toLowerCase().trim();
    if (!normalizedRoles.includes(userRole) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Your account role does not have permission for this action. Please re-login with a Volunteer account.",
      });
    }

    next();
  };
};