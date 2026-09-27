const Class = require('../models/Class');
const ClassRequest = require('../models/ClassRequest');

// 1. Creating a New Class (Create Class)
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
    res.status(201).json({ message: 'The class was successfully created!', classData: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. Retrieving the list of classes assigned to the relevant teacher (Get Classes)
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

// 3. Deleting a Class (Delete Class)
exports.deleteClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const classId = req.params.id;
    const deletedClass = await Class.findOneAndDelete({ _id: classId, teacherId: req.user.id });

    if (!deletedClass) {
      return res.status(404).json({ message: 'The class cannot be found, or you do not have permission to remove it.' });
    }

    res.json({ message: 'The class was successfully removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// 4. Retrieve all class data for the admin (Admin Get All Classes)
exports.getAllClassesForAdmin = async (req, res) => {
  try {
    // Populating class data with teacher data
    const classes = await Class.find()
      .populate('teacherId', 'name profilePhoto subject teacherId')
      .sort({ createdAt: -1 });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 5. A student requesting a class (Request Class)
exports.requestClass = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { classId, teacherId } = req.body;
    const studentId = req.user.id;

    // Checking whether a request has already been made
    const existing = await ClassRequest.findOne({ studentId, classId });
    if (existing) {
      return res.status(400).json({ message: 'You have already made a request for this class.' });
    }

    const newRequest = new ClassRequest({
      studentId,
      classId,
      teacherId,
      status: 'Pending'
    });

    await newRequest.save();
    res.status(201).json({ message: 'The class request was successfully sent!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 6. Obtaining the status of all the student's requests
exports.getStudentRequests = async (req, res) => {
  try {
    const requests = await ClassRequest.find({ studentId: req.user.id });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 7. Receiving all class requests for the admin
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

// 8. Admin approving or blocking the request
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body; // status: 'Approved' හෝ 'Blocked'
    const updated = await ClassRequest.findByIdAndUpdate(requestId, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'The request cannot be found.' });
    res.json({ message: `Request status ${status} was changed to`, updated });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 9. Complete removal of the student's class request by the admin (Delete Student Request)
exports.deleteClassRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const deleted = await ClassRequest.findByIdAndDelete(requestId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'The request cannot be found.' });
    }
    
    res.json({ message: 'The student was successfully removed from the class.' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};