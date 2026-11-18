// controllers/physicalMarkController.js
const mongoose = require('mongoose');
const PhysicalMark = require('../models/PhysicalMark');
const Teacher = require('../models/Teacher');

// Existing add functionality, plus the verified submitting teacher's identity.
exports.addPhysicalMark = async (req, res) => {
  try {
    const { instituteName, studentName, indexNumber, subjectName, className, marks, grade } = req.body;
    if (!studentName || !indexNumber || marks === undefined || !grade || !className) {
      return res.status(400).json({ success: false, message: 'අවශ්‍ය මූලික දත්ත සියල්ල ලබා දී නැත.' });
    }
    if (marks < 0 || marks > 100) {
      return res.status(400).json({ success: false, message: 'ලකුණු 0 සහ 100 අතර අගයක් විය යුතුය.' });
    }

    const actor = req.physicalMarksActor;
    if (!actor || actor.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only a logged-in teacher can add physical marks.' });
    }
    if (!actor.name) {
      return res.status(403).json({ success: false, message: 'Teacher name could not be identified. Check JWT and teacher model configuration.' });
    }

    const newMark = new PhysicalMark({
      instituteName,
      studentName,
      indexNumber,
      subjectName,
      className,
      marks,
      grade,
      teacherId: actor.id,
      teacherName: actor.name
    });
    await newMark.save();
    return res.status(201).json({
      success: true,
      message: 'Physical marks successfully saved to the database!',
      data: newMark
    });
  } catch (error) {
    console.error('Error saving physical mark:', error);
    return res.status(500).json({ success: false, message: 'සර්වර් දෝෂයක් සිදු විය.', error: error.message });
  }
};

// Get only records that belong to the verified teacher account.
// Teacher.teacherId is the public LOGIN ID, while Teacher._id is the
// canonical database ID. Older records may use either identifier.
// No ownerless / legacy records are exposed to teachers.
async function verifiedTeacherOwnerIds(actor) {
  if (!actor || actor.role !== 'teacher' || !mongoose.isValidObjectId(actor.id)) {
    return [];
  }

  const teacher = await Teacher.findById(actor.id)
    .select('_id teacherId')
    .lean();
  if (!teacher) return [];

  return [...new Set([
    String(teacher._id),
    String(teacher.teacherId || '').trim(),
  ].filter(Boolean))];
}

// This handler is used by BOTH existing GET URLs: '/' and '/all'.
// Always filter in MongoDB; filtering in a React component is not security.
const listAuthorizedPhysicalMarks = async (req, res) => {
  try {
    const actor = req.physicalMarksActor;
    if (!actor || !['teacher', 'admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let filter = {};
    if (actor.role === 'teacher') {
      const ownerIds = await verifiedTeacherOwnerIds(actor);
      if (!ownerIds.length) {
        return res.status(403).json({
          success: false, message: 'Teacher account could not be verified.'
        });
      }
      filter = { teacherId: { $in: ownerIds } };
    }

    const marks = await PhysicalMark.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: marks });
  } catch (error) {
    console.error('Error fetching physical marks:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve physical marks.' });
  }
};

exports.getPhysicalMarks = listAuthorizedPhysicalMarks;
exports.getPhysicalMarksByTeacher = listAuthorizedPhysicalMarks;

// Admin-only list. If stored teacherId is known, use the CURRENT Teacher.name.
// This also handles older records which stored Teacher.teacherId instead of MongoDB _id.
exports.getAdminPhysicalMarks = async (req, res) => {
  try {
    const marks = await PhysicalMark.find().sort({ createdAt: -1 }).lean();
    const savedIds = [...new Set(marks.map(mark => String(mark.teacherId || '').trim()).filter(Boolean))];
    const mongoIds = savedIds.filter(id => mongoose.isValidObjectId(id));
    const teachers = savedIds.length
      ? await Teacher.find({ $or: [
          ...(mongoIds.length ? [{ _id: { $in: mongoIds } }] : []),
          { teacherId: { $in: savedIds } }
        ] }).select('_id teacherId name').lean()
      : [];
    const teacherMap = new Map();
    for (const teacher of teachers) {
      teacherMap.set(String(teacher._id), teacher.name);
      teacherMap.set(String(teacher.teacherId), teacher.name);
    }
    const result = marks.map(mark => ({
      ...mark,
      teacherName: (mark.teacherId && teacherMap.get(String(mark.teacherId)))
        || mark.teacherName || ''
    }));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching admin physical marks:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve physical marks.' });
  }
};

// Admin uses this list to attribute older records to the CORRECT teacher.
// Never return passwords or private contact fields.
exports.getPhysicalMarkTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('_id teacherId name').sort({ name: 1 }).lean();
    return res.status(200).json({
      success: true,
      data: teachers.map(teacher => ({
        _id: String(teacher._id),
        teacherId: teacher.teacherId,
        name: teacher.name
      }))
    });
  } catch (error) {
    console.error('Error loading teachers for physical marks:', error);
    return res.status(500).json({ success: false, message: 'Failed to load teachers.' });
  }
};

// Only admin can backfill old records. Never infer the owner from the class name:
// identical class names can belong to different teachers. Assignment is explicit.
exports.assignLegacyPhysicalMarkTeacher = async (req, res) => {
  try {
    const { teacherId, className, recordId } = req.body || {};
    if (typeof teacherId !== 'string' || !teacherId.trim()) {
      return res.status(400).json({ success: false, message: 'Choose a valid teacher.' });
    }
    const chosenId = teacherId.trim();
    const teacher = await Teacher.findOne({ $or: [
      ...(mongoose.isValidObjectId(chosenId) ? [{ _id: chosenId }] : []),
      { teacherId: chosenId }
    ] }).select('_id name teacherId').lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher does not exist.' });
    }
    // Specify exactly one scope: a single record OR all unattributed records in a class.
    const byRecord = recordId !== undefined && recordId !== null;
    const byClass = className !== undefined && className !== null;
    if (byRecord === byClass) {
      return res.status(400).json({ success: false, message: 'Specify either recordId or className.' });
    }
    let filter;
    if (byRecord) {
      if (!mongoose.isValidObjectId(recordId)) {
        return res.status(400).json({ success: false, message: 'Invalid record ID.' });
      }
      filter = { _id: recordId };
    } else {
      if (typeof className !== 'string' || !className.trim() || className.length > 300) {
        return res.status(400).json({ success: false, message: 'Invalid class name.' });
      }
      filter = { className }; // preserve the database's exact class name
    }
    filter.$or = [
      { teacherId: { $exists: false } },
      { teacherId: null },
      { teacherId: '' }
    ];
    const result = await PhysicalMark.updateMany(filter, {
      $set: { teacherId: String(teacher._id), teacherName: teacher.name }
    });
    if (result.modifiedCount === 0) {
      return res.status(409).json({ success: false, message: 'No unattributed records in the selected scope. Refresh the page.' });
    }
    return res.status(200).json({
      success: true,
      updatedCount: result.modifiedCount,
      teacher: { _id: String(teacher._id), name: teacher.name, teacherId: teacher.teacherId },
      message: `Assigned ${result.modifiedCount} physical mark record(s) to ${teacher.name}.`
    });
  } catch (error) {
    console.error('Error assigning legacy physical mark teacher:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign teacher.' });
  }
};

// A teacher can delete only their OWN mark record; admin may delete any.
// The owner condition is included in the database delete query to avoid
// checking one record then deleting a different ownership state.
exports.deletePhysicalMark = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid mark record ID.' });
    }

    const actor = req.physicalMarksActor;
    if (!actor || !['teacher', 'admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let deletedMark;
    if (actor.role === 'admin') {
      deletedMark = await PhysicalMark.findByIdAndDelete(id);
    } else {
      const ownerIds = await verifiedTeacherOwnerIds(actor);
      if (!ownerIds.length) {
        return res.status(403).json({ success: false, message: 'Teacher account could not be verified.' });
      }
      deletedMark = await PhysicalMark.findOneAndDelete({
        _id: id, teacherId: { $in: ownerIds }
      });
    }

    if (!deletedMark) {
      return res.status(404).json({
        success: false, message: 'Record not found or not accessible to this account.'
      });
    }
    return res.status(200).json({ success: true, message: 'ලකුණු සටහන සාර්ථකව ඉවත් කරන ලදී!' });
  } catch (error) {
    console.error('Error deleting physical mark:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete physical mark.' });
  }
};

// Admin can remove one record using a dedicated admin URL.
exports.deleteAdminPhysicalMark = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid mark record ID.' });
    }
    const deleted = await PhysicalMark.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Record not found.' });
    return res.status(200).json({ success: true, message: 'Record successfully deleted.' });
  } catch (error) {
    console.error('Admin mark delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
};

// Admin can remove all papers belonging to *one exact teacher + class* group.
exports.deleteAdminPhysicalClass = async (req, res) => {
  try {
    const { teacherId, className } = req.body || {};
    if (typeof className !== 'string' || !className.trim() || className.length > 300) {
      return res.status(400).json({ success: false, message: 'A valid class name is required.' });
    }
    if (teacherId !== null && (typeof teacherId !== 'string' || !teacherId.trim())) {
      return res.status(400).json({ success: false, message: 'A valid teacher ID or null is required.' });
    }

    const filter = { className };
    if (teacherId === null) {
      // Old records, saved before teacher tracking was introduced.
      filter.$or = [
        { teacherId: { $exists: false } },
        { teacherId: null },
        { teacherId: '' }
      ];
    } else {
      filter.teacherId = teacherId;
    }

    const result = await PhysicalMark.deleteMany(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'No records found for this teacher and class.' });
    }
    return res.status(200).json({ success: true, deletedCount: result.deletedCount, message: `${result.deletedCount} records deleted.` });
  } catch (error) {
    console.error('Admin class delete error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete selected class records.' });
  }
};
