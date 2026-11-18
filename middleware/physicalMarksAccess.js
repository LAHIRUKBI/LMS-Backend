// middleware/physicalMarksAccess.js
// Identify the account using a VERIFIED JWT and the actual database record.
// Teacher.teacherId (public login ID) is not the same as Teacher._id (MongoDB ObjectId).
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const normalizeRole = (value) => {
  const role = String(value || '').trim().toLowerCase();
  if (['admin', 'administrator', 'superadmin', 'super_admin'].includes(role)) return 'admin';
  if (['teacher', 'instructor'].includes(role)) return 'teacher';
  return null;
};

function displayName(record) {
  if (!record) return '';
  const fullName = [record.firstName, record.lastName].filter(Boolean).join(' ').trim();
  return String(record.fullName || record.teacherName || record.name || fullName || record.username || '').trim();
}

async function findAccount(collection, id, email, isTeacher = false) {
  if (!mongoose.connection.db || (!id && !email)) return null;
  const or = [];
  if (id != null && String(id).trim()) {
    const identifier = String(id).trim();
    // Some JWTs use a string Mongo _id, others use Teacher.teacherId.
    or.push({ _id: identifier });
    if (mongoose.isValidObjectId(identifier)) {
      or.push({ _id: new mongoose.Types.ObjectId(identifier) });
    }
    if (isTeacher) or.push({ teacherId: identifier });
  }
  if (email) {
    or.push({ email: String(email).trim() });
    const lower = String(email).trim().toLowerCase();
    if (lower !== String(email).trim()) or.push({ email: lower });
  }
  return mongoose.connection.db.collection(collection).findOne({ $or: or });
}

async function authenticatePhysicalMarks(req, res, next) {
  try {
    const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (!process.env.JWT_SECRET) {
      console.error('Missing JWT_SECRET for physical marks authentication');
      return res.status(500).json({ success: false, message: 'Authentication configuration error.' });
    }

    const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
    }
    const claims = decoded.user && typeof decoded.user === 'object' ? decoded.user : decoded;
    const id = claims._id || claims.id || claims.userId || claims.teacherId || claims.adminId || decoded.sub;
    const email = claims.email || decoded.email || '';
    const claimRole = normalizeRole(claims.role || claims.userType || decoded.role || decoded.userType);
    if (!id && !email) {
      return res.status(401).json({ success: false, message: 'Token has no user identity.' });
    }

    const teacherCollection = process.env.PHYSICAL_TEACHERS_COLLECTION || 'teachers';
    const adminCollection = process.env.PHYSICAL_ADMINS_COLLECTION || 'admins';
    const userCollection = process.env.PHYSICAL_USERS_COLLECTION || 'users';

    let role = claimRole;
    let record = null;
    if (claimRole === 'teacher') {
      record = await findAccount(teacherCollection, id, email, true);
    } else if (claimRole === 'admin') {
      record = await findAccount(adminCollection, id, email);
    } else {
      // A role omitted from the token is resolved against actual accounts.
      const admin = await findAccount(adminCollection, id, email);
      if (admin) { role = 'admin'; record = admin; }
      if (!record) {
        const teacher = await findAccount(teacherCollection, id, email, true);
        if (teacher) { role = 'teacher'; record = teacher; }
      }
      if (!record) {
        const user = await findAccount(userCollection, id, email);
        const userRole = normalizeRole(user && (user.role || user.userType));
        if (userRole) { role = userRole; record = user; }
      }
    }

    // No identity is accepted on the strength of a token's role/name alone.
    if (!role || !record) {
      return res.status(403).json({ success: false, message: 'Teacher or admin account could not be verified.' });
    }
    if (record.isActive === false || ['blocked', 'suspended', 'inactive'].includes(String(record.status || '').toLowerCase())) {
      return res.status(403).json({ success: false, message: 'This account is inactive.' });
    }

    const canonicalId = String(record._id);
    const name = displayName(record);
    if (role === 'teacher' && !name) {
      return res.status(403).json({ success: false, message: 'Teacher name is missing from the teacher account.' });
    }
    req.physicalMarksActor = { id: canonicalId, role, name };
    return next();
  } catch (err) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired login token.' });
    }
    console.error('Physical marks authentication error:', err);
    return res.status(500).json({ success: false, message: 'Unable to verify access.' });
  }
}

const allowPhysicalRoles = (...roles) => (req, res, next) => {
  if (!req.physicalMarksActor || !roles.includes(req.physicalMarksActor.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  return next();
};

module.exports = { authenticatePhysicalMarks, allowPhysicalRoles };
