// ගොනුවේ නම: middleware/studentAuthMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Token එක Header එකෙන් ලබා ගැනීම (Format: "Bearer <token>")
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token එකක් නොමැත, කරුණාකර ලොග් වන්න.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Token එක verify කිරීම
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Decoded payload එකේ ඇති user object එක req.user වෙත ලබා දීම
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token එක කල් ඉකුත් වී හෝ වැරදියි.' });
  }
};