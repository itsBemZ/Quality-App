const jwt = require("jsonwebtoken");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

const roleCheck = (roles) => async (req, res, next) => {
  if (!req.headers.authorization) {
    res.locals.message = "No token provided, authorization denied";
    return res.status(403).json({ message: res.locals.message });
  }
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (roles.includes(decoded.role)) {
      if (decoded.isActive) {
        res.locals.message = "Access granted";
        next();
      } else {
        res.locals.message = "Your account is not active. Please contact support for more information.";
        return res.status(403).json({ message: res.locals.message });
      }
      
    } else {
      res.locals.message = "You don't have permission to access this resource.";
      return res.status(403).json({ message: res.locals.message });
    }
  } catch (error) {
    res.locals.message = "Token is not valid";
    res.status(401).json({ message: res.locals.message, error: error });
  }
};

module.exports = { roleCheck };
