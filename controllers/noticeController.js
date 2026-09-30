const Notice = require('../models/Notice');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Notification = require('../models/Notification');

// 1. Get Students List for Notice Selection
const getStudentsList = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }).select('-password');
    res.json(students);
  } catch (err) {
    console.error('Error fetching students list:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// 2. Get Teachers List for Notice Selection
const getTeachersList = async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 }).select('-password');
    res.json(teachers);
  } catch (err) {
    console.error('Error fetching teachers list:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// 3. Get All Published Notices
const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notices });
  } catch (error) {
    console.error('Fetch notices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices.' });
  }
};

// 4. Delete a Notice by ID
const deleteNotice = async (req, res) => {
  try {
    const noticeId = req.params.id;
    const deletedNotice = await Notice.findByIdAndDelete(noticeId);
    
    if (!deletedNotice) {
      return res.status(404).json({ success: false, message: 'Notice not found.' });
    }

    res.status(200).json({ success: true, message: 'Notice deleted successfully!' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notice.' });
  }
};

// 5. Create Notice with Image Support & Send Notifications to Target Audience
const createNotice = async (req, res) => {
  try {
    const { title, message, targetType, targetGrades, targetStudents, targetTeachers, senderId } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !message || !targetType) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const parsedGrades = targetGrades ? JSON.parse(targetGrades) : [];
    const parsedStudents = targetStudents ? JSON.parse(targetStudents) : [];
    const parsedTeachers = targetTeachers ? JSON.parse(targetTeachers) : [];

    const newNotice = new Notice({
      title,
      message,
      targetType,
      targetGrades: parsedGrades,
      targetStudents: parsedStudents,
      targetTeachers: parsedTeachers,
      image: imagePath,
      sender: senderId || '60c72b2f9b1d8b2778fc35ab'
    });

    await newNotice.save();

    // Save notifications data for target audience in the database
    let recipientStudentIds = [];
    let recipientTeacherIds = [];

    if (targetType === 'all_students' || targetType === 'everyone') {
      const allStudents = await Student.find({}, '_id');
      recipientStudentIds = allStudents.map(s => s._id.toString());
    } else if (targetType === 'grade_students' && parsedGrades.length > 0) {
      const gradeStudents = await Student.find({ grade: { $in: parsedGrades } }, '_id');
      recipientStudentIds = gradeStudents.map(s => s._id.toString());
    } else if (targetType === 'individual_student') {
      recipientStudentIds = parsedStudents;
    }

    if (targetType === 'all_teachers' || targetType === 'everyone') {
      const allTeachers = await Teacher.find({}, '_id');
      recipientTeacherIds = allTeachers.map(t => t._id.toString());
    } else if (targetType === 'individual_teacher') {
      recipientTeacherIds = parsedTeachers;
    }

    // Save notifications for students (recipientRole: 'student' included)
    const studentNotifications = recipientStudentIds.map(studentId => ({
      userId: studentId,
      recipientRole: 'student',
      title: `Notice: ${title}`,
      message: message,
      isRead: false
    }));

    if (studentNotifications.length > 0) {
      await Notification.insertMany(studentNotifications);
    }

    // Save notifications for teachers (recipientRole: 'teacher' included)
    const teacherNotifications = recipientTeacherIds.map(teacherId => ({
      userId: teacherId,
      recipientRole: 'teacher',
      title: `Notice: ${title}`,
      message: message,
      isRead: false
    }));

    if (teacherNotifications.length > 0) {
      await Notification.insertMany(teacherNotifications);
    }

    res.status(201).json({
      success: true,
      message: 'Notice published and notifications sent successfully!',
      data: newNotice
    });
  } catch (error) {
    console.error('Notice creation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// 6. Get Notices for a Specific Student
const getStudentNotices = async (req, res) => {
  try {
    const studentId = req.user.id; 
    
    // Fetch student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Fetch notices matching the student from Notice Model
    const notices = await Notice.find({
      $or: [
        { targetType: 'everyone' },
        { targetType: 'all_students' },
        { targetType: 'grade_students', targetGrades: student.grade },
        { targetType: 'individual_student', targetStudents: studentId }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(notices);
  } catch (error) {
    console.error('Fetch student notices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. The function for accessing notices relevant to teachers.
const getTeacherNotices = async (req, res) => {
  try {
    // Since there is no middleware, let's retrieve the `teacherId` from the URL parameter.
    const teacherId = req.params.id; 
    
    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Teacher ID is required' });
    }

    // Fetch notices matching the teacher from Notice Model
    const notices = await Notice.find({
      $or: [
        { targetType: 'everyone' },
        { targetType: 'all_teachers' },
        { targetType: 'individual_teacher', targetTeachers: teacherId }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json(notices);
  } catch (error) {
    console.error('Fetch teacher notices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getStudentsList,
  getTeachersList,
  getAllNotices,
  deleteNotice,
  createNotice,
  getStudentNotices,
  getTeacherNotices
};