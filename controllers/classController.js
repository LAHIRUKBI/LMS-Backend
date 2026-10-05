const Class = require('../models/Class');
const ClassRequest = require('../models/ClassRequest');

// 1. Creating a New Class (Create Class)
exports.createClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { 
      grade, 
      customGradeName, 
      medium, 
      mode, 
      onlineLink, 
      provideLater, 
      linkDisplayMode,
      linkStartDateTime,
      linkEndDateTime,
      instituteName, 
      instituteAddress, 
      day, 
      startTime, 
      endTime, 
      description 
    } = req.body;
    
    let coverImage = "";
    if (req.file) {
      coverImage = `/Class_Cover_images/${req.file.filename}`;
    }

    const isProvideLater = provideLater === 'true' || provideLater === true;
    const displayMode = linkDisplayMode || 'scheduled';

    const newClass = new Class({
      teacherId: req.user.id,
      grade,
      customGradeName: grade === 'Other' ? customGradeName : "",
      medium,
      mode,
      onlineLink: mode === 'Online' && !isProvideLater ? onlineLink : "",
      provideLater: isProvideLater,
      linkDisplayMode: displayMode,
      linkStartDateTime: (mode === 'Online' && !isProvideLater && displayMode === 'scheduled' && linkStartDateTime) ? new Date(linkStartDateTime) : null,
      linkEndDateTime: (mode === 'Online' && !isProvideLater && displayMode === 'scheduled' && linkEndDateTime) ? new Date(linkEndDateTime) : null,
      instituteName: mode === 'Offline' ? instituteName : "",
      instituteAddress: mode === 'Offline' ? instituteAddress : "",
      day,
      startTime,
      endTime,
      coverImage,
      description: description || ""
    });

    await newClass.save();
    res.status(201).json({ message: 'The class was successfully created!', classData: newClass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// Scheduled නම් සහ කාලය ඉකුත් වී ඇත්නම් expired වීම
const checkAndExpireLinks = async (classesList) => {
  const now = new Date();
  let modified = false;

  for (let cls of classesList) {
    if (cls.onlineLink && !cls.provideLater && cls.linkDisplayMode === 'scheduled' && cls.linkEndDateTime && new Date(cls.linkEndDateTime) < now) {
      cls.onlineLink = "";
      cls.provideLater = true;
      cls.linkStartDateTime = null;
      cls.linkEndDateTime = null;
      await cls.save();
      modified = true;
    }
  }
  return classesList;
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
// Get All Classes for Admin / Students (මෙතැනදීද ළමයාට පෙන්වන විට expired වූ links ඉවත් වේ)
exports.getAllClassesForAdmin = async (req, res) => {
  try {
    let classes = await Class.find()
      .populate('teacherId', 'name profilePhoto subject teacherId')
      .sort({ createdAt: -1 });
    classes = await checkAndExpireLinks(classes);
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

// 7. Receiving all class requests for the admin (Strictly verifying if this specific class was requested via Free Card)
exports.getAllClassRequests = async (req, res) => {
  try {
    const FreeCardRequest = require('../models/freeCardRequests');

    const requests = await ClassRequest.find()
      .populate('studentId', 'name email profileImage grade school phone address')
      .populate('classId')
      .populate('teacherId', 'name subject');

    const enrichedRequests = await Promise.all(requests.map(async (reqItem) => {
      let isFreeCard = false;
      if (reqItem.studentId && reqItem.classId) {
        // Check: Has this student officially submitted a Free Card application (FreeCardRequest) for this specific class (classId)?
        const freeCardReq = await FreeCardRequest.findOne({ 
          studentId: reqItem.studentId._id, 
          selectedClasses: { $in: [reqItem.classId._id] } 
        });
        
        if (freeCardReq) {
          isFreeCard = true;
        }
      }
      return {
        ...reqItem.toObject(),
        isFreeCard
      };
    }));

    res.json(enrichedRequests);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 8. Admin approving or blocking the request
exports.updateRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body; // status: 'Approved' හෝ 'Blocked'
    const updated = await ClassRequest.findByIdAndUpdate(requestId, { status }, { new: true })
      .populate('classId');

    if (!updated) return res.status(404).json({ message: 'The request cannot be found.' });

    // සිසුවාට Notification එකක් යැවීම
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: updated.studentId,
      recipientRole: 'student',
      title: status === 'Approved' ? 'Class Request Approved! 🎉' : 'Class Request Blocked',
      message: status === 'Approved' 
        ? `Your request to join the class has been approved by the admin.` 
        : `Your request to join the class has been blocked by the admin.`
    });

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


// 10. Admin updating class details (Cover image & Description)
exports.adminUpdateClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const classId = req.params.id;
    const { description } = req.body;
    
    let updateData = { description };
    if (req.file) {
      updateData.coverImage = `/Class_Cover_images/${req.file.filename}`;
    }

    const updatedClass = await Class.findByIdAndUpdate(classId, updateData, { new: true });
    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    res.json({ message: 'Class details successfully updated by admin!', classData: updatedClass });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// නව ක්‍රමවේදය: ගුරුවරයාට තමන්ගේ පන්තිය Update කිරීම සඳහා (Link එක දැමීමට, වෙනස් කිරීමට හෝ Close කිරීමට)
// Teacher Update Class (Updated to support forcing immediate open on scheduled links)
exports.updateTeacherClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const classId = req.params.id;
    const { 
      onlineLink, 
      provideLater, 
      linkDisplayMode,
      linkStartDateTime,
      linkEndDateTime,
      description,
      instituteName,
      instituteAddress
    } = req.body;

    const classItem = await Class.findOne({ _id: classId, teacherId: req.user.id });
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found or permission denied.' });
    }

    if (onlineLink !== undefined) classItem.onlineLink = onlineLink;
    if (provideLater !== undefined) classItem.provideLater = provideLater;
    if (linkDisplayMode !== undefined) classItem.linkDisplayMode = linkDisplayMode;
    
    // જો immediate නම් dates null වේ, scheduled නම් නව කාලසීමාව ඇතුළත් වේ
    if (linkDisplayMode === 'immediate') {
      classItem.linkStartDateTime = null;
      classItem.linkEndDateTime = null;
    } else {
      if (linkStartDateTime !== undefined) classItem.linkStartDateTime = linkStartDateTime ? new Date(linkStartDateTime) : null;
      if (linkEndDateTime !== undefined) classItem.linkEndDateTime = linkEndDateTime ? new Date(linkEndDateTime) : null;
    }

    if (description !== undefined) classItem.description = description;
    if (instituteName !== undefined) classItem.instituteName = instituteName;
    if (instituteAddress !== undefined) classItem.instituteAddress = instituteAddress;

    if (req.file) {
      classItem.coverImage = `/Class_Cover_images/${req.file.filename}`;
    }

    await classItem.save();
    res.json({ message: 'Class successfully updated!', classData: classItem });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};