const FreeCardRequest = require('../models/freeCardRequests');
const Student = require('../models/Student');
const Class = require('../models/Class');
const ClassRequest = require('../models/ClassRequest');
exports.submitFreeCardRequest = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { 
      fatherName, 
      fatherOccupation, 
      fatherPhone, 
      motherName, 
      motherOccupation, 
      motherPhone, 
      hasGuardian, 
      guardianName, 
      guardianRelation, 
      guardianPhone, 
      familyBackground, 
      studentName, 
      email, 
      phone, 
      address, 
      selectedClasses 
    } = req.body;

    if (!studentId) {
      return res.status(401).json({ message: 'Unauthorized: Student ID not found.' });
    }

    // 1. Updating the phone number or address on the student's profile.
    await Student.findByIdAndUpdate(studentId, { phone, address });

    let filePaths = [];
    if (req.files && req.files.length > 0) {
      filePaths = req.files.map(file => `/free_card_request/${file.filename}`);
    }

    // 2. Parse selectedClasses
    let parsedClasses = [];
    if (selectedClasses) {
      parsedClasses = typeof selectedClasses === 'string' ? JSON.parse(selectedClasses) : selectedClasses;
    }

    // 3. Saving the free card request
    const newRequest = new FreeCardRequest({
      studentId,
      studentName: studentName || "Unknown",
      email: email || "Unknown",
      phone,
      address,
      fatherName: fatherName || "",
      fatherOccupation: fatherOccupation || "",
      fatherPhone: fatherPhone || "",
      motherName: motherName || "",
      motherOccupation: motherOccupation || "",
      motherPhone: motherPhone || "",
      hasGuardian: hasGuardian === 'true' || hasGuardian === true,
      guardianName: guardianName || "",
      guardianRelation: guardianRelation || "",
      guardianPhone: guardianPhone || "",
      familyBackground,
      selectedClasses: parsedClasses,
      files: filePaths
    });

    await newRequest.save();

    // 4. Creating a ClassRequest for each class selected by the student, so that it appears on the AdminClassViewPage.
    if (parsedClasses && parsedClasses.length > 0) {
      for (const classId of parsedClasses) {
        // Finding the teacherId associated with the class
        const targetClass = await Class.findById(classId);
        if (targetClass) {
          // Checking whether a request has previously been made for that class.
          const existingClassReq = await ClassRequest.findOne({ studentId, classId });
          if (!existingClassReq) {
            await ClassRequest.create({
              studentId,
              classId,
              teacherId: targetClass.teacherId,
              status: 'Pending'
            });
          }
        }
      }
    }

    res.status(201).json({ message: 'Free card request and class joins submitted successfully!', data: newRequest });
  } catch (err) {
    console.error("Free Card Submission Error:", err);
    res.status(500).json({ message: err.message || 'Server Error during free card submission.' });
  }
};

exports.getFreeCardRequestByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId } = req.query; // Retrieving the classId as a query parameter

    let query = { studentId };
    if (classId) {
      query.selectedClasses = { $in: [classId] }; // Search only for Free Card requests that include this specific class.
    }

    const request = await FreeCardRequest.findOne(query).sort({ createdAt: -1 });
    if (!request) {
      return res.status(404).json({ message: 'Free card request not found for this class and student.' });
    }
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};