const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'jwt_secret';

function auth(req, res, next) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header) return res.status(401).json({ message: 'Authorization required' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authorization token missing' });
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload; // { id, username, permission }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.permission !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports = { auth, requireRole };
