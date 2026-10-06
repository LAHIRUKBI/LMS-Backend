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

    let requests = await ClassRequest.find()
      .populate('studentId', 'name email profileImage grade school phone address')
      .populate('classId')
      .populate('teacherId', 'name subject');

    // ස්වයංක්‍රීය මාසික බ්ලොක් කිරීමේ ලොජික් එක ක්‍රියාත්මක කිරීම
    const { requestsList } = await checkAndAutoBlockMonthlyRequests(requests);

    const enrichedRequests = await Promise.all(requestsList.map(async (reqItem) => {
      let isFreeCard = false;
      if (reqItem.studentId && reqItem.classId) {
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
    
    let updateData = { status };
    if (status === 'Approved') {
      updateData.approvedAt = new Date(); // Approve කළ මොහොත සටහන් කර ගැනීම
    }

    const updated = await ClassRequest.findByIdAndUpdate(requestId, updateData, { new: true })
      .populate('classId');

    if (!updated) return res.status(404).json({ message: 'The request cannot be found.' });

    const Notification = require('../models/Notification');
    await Notification.create({
      userId: updated.studentId,
      recipientRole: 'student',
      title: status === 'Approved' ? 'Class Request Approved! 🎉' : 'Class Request Blocked',
      message: status === 'Approved' 
        ? `Your request to join the class has been approved by the admin.` 
        : `Your request to join the class has been blocked by the admin.`
    });

    res.json({ message: `Request status changed to ${status}`, updated });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 9. Complete removal of the student's class request by the admin (Delete Student Request)
// 9. Complete removal or canceling of the student's class request (Student can cancel their pending request, Admin can delete any)
exports.deleteClassRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    // If the user is a student (case-insensitive check), ensure they can only delete their own 'Pending' request
    if (req.user.role && req.user.role.toLowerCase() === 'student') {
      const requestItem = await ClassRequest.findOne({ _id: requestId, studentId: req.user.id });
      
      if (!requestItem) {
        return res.status(404).json({ message: 'The request cannot be found or you do not have permission.' });
      }
      
      if (requestItem.status !== 'Pending') {
        return res.status(400).json({ message: 'You can only cancel pending requests.' });
      }

      await ClassRequest.findByIdAndDelete(requestId);
      return res.json({ message: 'The request was successfully cancelled.' });
    }

    // For admin or other authorized roles
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

// නව එකතු කිරීම: පන්තියක ඇති සියලුම Pending / Requests එකවර Approve කිරීම සඳහා
exports.approveAllClassRequestsForClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { classId } = req.body;

    // එම පන්තියේ Pending හෝ Blocked වී ඇති සියලුම ඉල්ලීම් එකවර Approved කිරීම
    await ClassRequest.updateMany(
      { classId, status: { $ne: 'Approved' } },
      { $set: { status: 'Approved', approvedAt: new Date() } }
    );

    res.json({ message: 'All students in this class have been successfully approved!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// මාසික දින ගණන සහ ගෙවී ගිය දින ගණන ගණනය කර ස්වයංක්‍රීයව Block කිරීමේ ශ්‍රිතය
const checkAndAutoBlockMonthlyRequests = async (requestsList) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 - 11

  // මාසයේ මුල් දිනය (මධ්‍යම රාත්‍රී 12:00)
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  // මාසයේ අවසාන දිනය
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // මුලු දින ගණන (උදා: 30 හෝ 31)
  const totalDaysInMonth = endOfMonth.getDate();
  
  // මාසයේ දැනට ගෙවී ගොස් ඇති දින ගණන (අද දවස ඇතුළුව)
  const daysPassed = Math.min(now.getDate(), totalDaysInMonth);

  let modified = false;

  for (let req of requestsList) {
    // Approve වී ඇති සිසුන් පමණක් පරීක්ෂා කිරීම
    if (req.status === 'Approved' && req.approvedAt) {
      const approvalDate = new Date(req.approvedAt);
      
      // සිසුවා Approve වූ දිනය මෙම මාසයට පෙර එකක් නම් හෝ, 
      // වත්මන් මාසය ඉකුත් වී ඇත්නම්, එසේත් නැතිනම් මාසය අවසන් වී ඇත්නම් (අද දවස මාසයේ දින ගණන ඉක්මවා ගොස් නම්)
      if (approvalDate < startOfMonth || now > endOfMonth) {
        req.status = 'Blocked';
        await req.save();
        modified = true;
      }
    }
  }

  return { requestsList, totalDaysInMonth, daysPassed };
};

// පන්තියක සිටින සියලුම සිසුන් එකවර Block කිරීම සඳහා
exports.blockAllClassRequestsForClass = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied.' });
    }

    const { classId } = req.body;

    // එම පන්තියේ සිසුන් සියල්ලන්ගේ status එක Block කිරීම සහ approvedAt ඉවත් කිරීම
    await ClassRequest.updateMany(
      { classId },
      { $set: { status: 'Blocked' } }
    );

    res.json({ message: 'All students in this class have been successfully blocked!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};