const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// 1. Add Teacher API (Admin ට පමණක් අවසර ඇත)
const addTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied. You are not an admin!' });
    }

    const { teacherId, name, email, subject, password } = req.body;

    // Teacher ID එක පරීක්ෂා කිරීම
    let existingTeacher = await Teacher.findOne({ teacherId });
    if (existingTeacher) {
      return res.status(400).json({ message: 'This Teacher ID is already in use!' });
    }

    // Email එකක් දී ඇත්නම්, එය වෙනත් අයෙකු සතුදැයි පරීක්ෂා කිරීම
    if (email && email.trim() !== "") {
      let existingEmail = await Teacher.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'මෙම Email ලිපිනය දැනටමත් වෙනත් ගුරුවරයෙකු සතුය!' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // අලුත් ගුරුවරයා සෑදීම (ඊමේල් නැත්නම් එය field එකෙන් ඉවත් වේ)
    const newTeacherData = {
      teacherId,
      name,
      subject,
      password: hashedPassword,
    };

    if (email && email.trim() !== "") {
      newTeacherData.email = email.trim();
    }

    const newTeacher = new Teacher(newTeacherData);
    await newTeacher.save();

    let emailStatusMessage = '';

    // ඊමේල් එකක් දී ඇත්නම් පමණක් යැවීම
    if (email && email.trim() !== "") {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'The LMS teacher account was successfully created - Login Details',
        html: `
          <h3>Welcome ${name},</h3>
          <p>Your LMS teacher account has been successfully created. You can log in to the system using the details below:</p>
          <ul>
            <li><b>Teacher ID:</b> ${teacherId}</li>
            <li><b>Temporary Password:</b> ${password}</li>
          </ul>
          <p>Please change your password via your profile page after logging in for the first time.</p>
          <br>
          <p>Thank You,<br>Administrator</p>
        `
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.response);
        emailStatusMessage = ' And login details were sent to the email!';
      } catch (mailErr) {
        console.error("Email sending failed:", mailErr.message);
        emailStatusMessage = ' (Email sending failed: ' + mailErr.message + ')';
      }
    } else {
      emailStatusMessage = ' (No email address provided.)';
    }

    res.status(201).json({ 
      message: 'The teacher was successfully registered.' + emailStatusMessage
    });

  } catch (err) {
    console.error("Add Teacher Error:", err.message);
    res.status(500).json({ message: 'Server Error: ' + err.message });
  }
};

// 2. Get All Teachers API
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-password').sort({ createdAt: -1 });
    res.json(teachers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 3. Get All Admins API
const getAllAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const admins = await Admin.find().select('-password').sort({ createdAt: 1 });
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 4. Delete Admin API
const deleteAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const adminIdToDelete = req.params.id;
    const adminToDelete = await Admin.findById(adminIdToDelete);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'මෙම Admin ගිණුම සොයාගත නොහැක.' });
    }

    if (adminToDelete.isDefault) {
      return res.status(400).json({ message: 'ප්‍රධාන (Super Admin) ගිණුම ඉවත් කළ නොහැක!' });
    }

    if (adminToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'ඔබට ඔබගේම ගිණුම ඉවත් කළ නොහැක!' });
    }

    await Admin.findByIdAndDelete(adminIdToDelete);
    res.json({ message: 'Admin ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 5. Delete Teacher API
const deleteTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'අවසර ප්‍රතික්ෂේප විය!' });
    }

    const teacherIdToDelete = req.params.id;
    const teacherToDelete = await Teacher.findById(teacherIdToDelete);
    
    if (!teacherToDelete) {
      return res.status(404).json({ message: 'මෙම ගුරුවරයාගේ ගිණුම සොයාගත නොහැක.' });
    }

    await Teacher.findByIdAndDelete(teacherIdToDelete);
    res.json({ message: 'ගුරු ගිණුම සාර්ථකව ඉවත් කරන ලදී.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

//6. සියලුම සිසුන්ගේ දත්ත ලබාගැනීමේ Controller Function එක
const getAllStudents = async (req, res) => {
  try {
    // අලුත්ම සිසුන් මුලින් එන සේ (createdAt: -1) සහ password එක අයින් කර දත්ත ලබා ගැනීම
    const students = await Student.find().sort({ createdAt: -1 }).select('-password');
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// --- New Student Tracking Functions ---

// 1. Retrieving the count of new children for the sidebar
const getNewStudentCount = async (req, res) => {
  try {
    const count = await Student.countDocuments({ isNewForSidebar: true });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. Removing the number when the sidebar is clicked (setting `isNewForSidebar` to `false`)
const clearSidebarBadge = async (req, res) => {
  try {
    await Student.updateMany({ isNewForSidebar: true }, { isNewForSidebar: false });
    res.json({ message: 'Sidebar badge cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Removing the child's dot from the table (setting `isNewForTable` to `false`)
const clearStudentRowDot = async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isNewForTable: false });
    res.json({ message: 'Student row dot cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// අදාල Functions සියල්ල Export කිරීම
module.exports = {
  addTeacher,
  getAllTeachers,
  getAllAdmins,
  deleteAdmin,
  deleteTeacher,
  getAllStudents,
  getNewStudentCount,
  clearSidebarBadge,
  clearStudentRowDot
};