const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');

// 1. Add Teacher API (Access restricted to Admin only)
const addTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied. You are not an admin!' });
    }

    const { teacherId, name, email, subject, password } = req.body;

    // Checking the Teacher ID
    let existingTeacher = await Teacher.findOne({ teacherId });
    if (existingTeacher) {
      return res.status(400).json({ message: 'This Teacher ID is already in use!' });
    }

    // Checking if a provided email address belongs to someone else.
    if (email && email.trim() !== "") {
      let existingEmail = await Teacher.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'This email address already belongs to another teacher!' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Creating a new teacher (if there is no email, it is removed from the field)
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

    // Send only if an email address has been provided.
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
      return res.status(403).json({ message: 'Permission denied!' });
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
    // 1. පරිශීලකයා Admin කෙනෙක්ද සහ සුපර් ඇඩ්මින් (isDefault) කෙනෙක්ද යන්න පරීක්ෂා කිරීම
    if (req.user.role !== 'admin' || !req.user.isDefault) {
      return res.status(403).json({ message: 'මෙම ක්‍රියාව සිදු කිරීමට ඔබට අවසර නැත! ඇඩ්මින්වරුන් ඉවත් කළ හැක්කේ සුපර් ඇඩ්මින්ට පමණි.' });
    }

    const adminIdToDelete = req.params.id;
    const adminToDelete = await Admin.findById(adminIdToDelete);

    if (!adminToDelete) {
      return res.status(404).json({ message: 'This admin account cannot be found.' });
    }

    if (adminToDelete.isDefault) {
      return res.status(400).json({ message: 'The main (Super Admin) account cannot be removed!' });
    }

    if (adminToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account!' });
    }

    await Admin.findByIdAndDelete(adminIdToDelete);
    res.json({ message: 'The admin account was successfully removed.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 5. Delete Teacher API
const deleteTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied!' });
    }

    const teacherIdToDelete = req.params.id;
    const teacherToDelete = await Teacher.findById(teacherIdToDelete);
    
    if (!teacherToDelete) {
      return res.status(404).json({ message: 'This teachers account cannot be found..' });
    }

    await Teacher.findByIdAndDelete(teacherIdToDelete);
    res.json({ message: 'The teacher account was successfully removed.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

//6. The controller function for retrieving data for all students.
const getAllStudents = async (req, res) => {
  try {
    // Retrieving data with the newest students appearing first (createdAt: -1) and excluding the password.
    const students = await Student.find().sort({ createdAt: -1 }).select('-password');
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 7. Delete Single Student API
const deleteStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied!' });
    }

    const studentIdToDelete = req.params.id;
    const studentToDelete = await Student.findById(studentIdToDelete);

    if (!studentToDelete) {
      return res.status(404).json({ message: 'Student account not found.' });
    }

    await Student.findByIdAndDelete(studentIdToDelete);
    res.json({ message: 'Student account was successfully removed.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 8. Delete All Students API
const deleteAllStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied!' });
    }

    await Student.deleteMany({});
    res.json({ message: 'All student accounts were successfully removed.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 1. Admin ගේ Profile එක ලබා ගැනීම
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin account not found.' });
    res.json(admin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// 2. Admin ගේ Profile එක යාවත්කාලීන කිරීම
// 2. Admin ගේ Profile එක යාවත්කාලීන කිරීම
const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, phoneNumber } = req.body;
    let admin = await Admin.findById(req.user.id);

    if (!admin) return res.status(404).json({ message: 'Admin account not found.' });

    // තොරතුරු යාවත්කාලීන කිරීම
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (phoneNumber) admin.phoneNumber = phoneNumber;

    // අලුත් ඡායාරූපයක් Upload කර ඇත්නම්
    if (req.file) {
      // කලින් ඡායාරූපයක් තිබේ නම් එය Server එකෙන් මකා දැමීම (Delete old photo)
      if (admin.profilePhoto) {
        // admin.profilePhoto හි ඇත්තේ 'profile_photos/admin-123.jpg' වැනි අගයකි.
        // අපි backend එකේ root folder එකට point කරලා delete කරන්න ඕනේ.
        const oldPhotoPath = path.join(__dirname, '../', admin.profilePhoto);
        
        try {
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                console.log(`Successfully deleted old photo: ${oldPhotoPath}`);
            } else {
                 console.log(`Old photo not found to delete: ${oldPhotoPath}`);
            }
        } catch (unlinkErr) {
             console.error(`Error deleting old photo: ${oldPhotoPath}`, unlinkErr);
             // පින්තූරය delete කරන්න බැරි උනත් අලුත් එක save කිරීම නතර කරන්න එපා.
        }
      }
      // අලුත් ඡායාරූපයේ path එක save කිරීම
      admin.profilePhoto = 'profile_photos/' + req.file.filename;
    }

    await admin.save();
    res.json({ message: 'Profile updated successfully!', admin });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error during profile update' });
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


module.exports = {
  addTeacher,
  getAllTeachers,
  getAllAdmins,
  deleteAdmin,
  deleteTeacher,
  getAllStudents,
  getNewStudentCount,
  clearSidebarBadge,
  clearStudentRowDot,
  deleteStudent,
  deleteAllStudents,
  getAdminProfile,
  updateAdminProfile
};