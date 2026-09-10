const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Request header එකෙන් token එක ලබා ගැනීම (Bearer <token> ආකෘතියෙන් එන්නේ)
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token එකක් නොමැත. අවසර ප්‍රතික්ෂේප විය!' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Token එක නිවැරදිදැයි පරීක්ෂා කිරීම
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Decoded user විස්තර req.user එකට ඇතුලත් කිරීම
    req.user = decoded.user;
    next(); // ඊළඟ පියවරට (API Route එකට) යන්න දෙනවා
  } catch (err) {
    res.status(401).json({ message: 'Token එක වලංගු නොවේ!' });
  }
};