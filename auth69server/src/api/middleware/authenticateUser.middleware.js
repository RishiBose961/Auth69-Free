import { verifyToken } from "../../utils/jwt.utils.js";

export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.cookies?.token || null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Unauthorized - No token provided" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Unauthorized - Invalid or expired token" });
  }

  req.user = decoded;
  next();
};

export default authenticateUser;
