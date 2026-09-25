const Class = require('../models/Class');
const ClassRequest = require('../models/ClassRequest');

// 1. නව පන්තියක් නිර්මාණය කිරීම (Create Class)
exports.createClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { grade, medium, mode, day, startTime, endTime } = req.body;

    const newClass = new Class({
      teacherId: req.user.id,
      grade,
      medium,
      mode,
      day,
      startTime,
      endTime
    });

    await newClass.save();
    res.status(201).json({ message: 'පන්තිය සාර්ථකව නිර්මාණය කරන ලදී!', classData: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. අදාළ ගුරුවරයාට අයත් පන්ති ලැයිස්තුව ලබාගැනීම (Get Classes)
exports.getTeacherClasses = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const classes = await Class.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. පන්තියක් ඉවත් කිරීම (Delete Class)
exports.deleteClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const classId = req.params.id;
    const deletedClass = await Class.findOneAndDelete({ _id: classId, teacherId: req.user.id });

    if (!deletedClass) {
      return res.status(404).json({ message: 'පන්තිය සොයාගැනීමට නොහැක හෝ ඔබට එය ඉවත් කිරීමට අවසර නැත.' });
    }

    res.json({ message: 'පන්තිය සාර්ථකව ඉවත් කරන ලදී.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// 4. ඇඩ්මින් සඳහා සියලුම පන්ති දත්ත ලබාගැනීම (Admin Get All Classes)
exports.getAllClassesForAdmin = async (req, res) => {
  try {
    // Teacher දත්ත සමග Class දත්ත ලබා ගැනීම (populate)
    const classes = await Class.find()
      .populate('teacherId', 'name profilePhoto subject teacherId')
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 5. සිසුවෙකු විසින් පන්තියක් සඳහා ඉල්ලුම් කිරීම (Request Class)
exports.requestClass = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { classId, teacherId } = req.body;
    const studentId = req.user.id;

    // දැනටමත් ඉල්ලීමක් කර ඇද්දැයි පරීක්ෂා කිරීම
    const existing = await ClassRequest.findOne({ studentId, classId });
    if (existing) {
      return res.status(400).json({ message: 'ඔබ දැනටමත් මෙම පන්තිය සඳහා ඉල්ලීමක් කර ඇත.' });
    }

    const newRequest = new ClassRequest({
      studentId,
      classId,
      teacherId,
      status: 'Pending'
    });

    await newRequest.save();
    res.status(201).json({ message: 'පන්ති ඉල්ලීම සාර්ථකව යවන ලදී!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 6. සිසුවාගේ සියලුම ඉල්ලීම්වල තත්ත්වය ලබාගැනීම
exports.getStudentRequests = async (req, res) => {
  try {
    const requests = await ClassRequest.find({ studentId: req.user.id });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 7. ඇඩ්මින් සඳහා සියලුම පන්ති ඉල්ලීම් ලබාගැනීම
exports.getAllClassRequests = async (req, res) => {
  try {
    const requests = await ClassRequest.find()
      .populate('studentId', 'name email profileImage grade school')
      .populate('classId')
      .populate('teacherId', 'name subject');
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 8. ඇඩ්මින් විසින් ඉල්ලීම Approve හෝ Block කිරීම
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body; // status: 'Approved' හෝ 'Blocked'
    const updated = await ClassRequest.findByIdAndUpdate(requestId, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'ඉල්ලීම සොයාගත නොහැක.' });
    res.json({ message: `ඉල්ලීමේ තත්ත්වය ${status} ලෙස වෙනස් කරන ලදී.`, updated });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};