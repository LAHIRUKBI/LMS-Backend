const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');

// 1. Add Teacher API (Admin ට පමණක් අවසර ඇත)
const addTeacher = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied. You are not an admin!' });
    }

    const { teacherId, name, email, subject, password } = req.body;

    // Checking if the Teacher ID already exists
    let existingTeacher = await Teacher.findOne({ teacherId });
    if (existingTeacher) {
      return res.status(400).json({ message: 'This Teacher ID is already in use!' });
    }

    // Checking if a provided email address belongs to someone else
    if (email && email.trim() !== "") {
      let existingEmail = await Teacher.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'මෙම Email ලිපිනය දැනටමත් වෙනත් ගුරුවරයෙකු සතුය!' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newTeacher = new Teacher({
      teacherId,
      name,
      email: email || "", 
      subject,
      password: hashedPassword,
    });

    await newTeacher.save();

    let emailStatusMessage = '';

    // Send login details only if an email address has been provided.
    if (email && email.trim() !== "") {
      // Bringing the transporter here ensures the .env values ​​are loaded correctly.
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
        subject: 'The LMS teacher account was successfully created. - Login Details',
        html: `
          <h3>Welcome ${name},</h3>
          <p>Your LMS teacher account has been successfully created. You can log in to the system using the details below.</p>
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
        emailStatusMessage = ' And the details were successfully sent to the teacher address!';
      } catch (mailErr) {
        console.error("Email sending failed:", mailErr.message);
        emailStatusMessage = ' (However, sending the email failed: ' + mailErr.message + ')';
      }
    } else {
      emailStatusMessage = ' (No email address has been provided.)';
    }

    res.status(201).json({ 
      message: 'The teacher was successfully registered.' + emailStatusMessage
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// 2. Get All Teachers API
const getAllTeachers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied!' });
    }

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

// අදාල Functions සියල්ල Export කිරීම
module.exports = {
  addTeacher,
  getAllTeachers,
  getAllAdmins,
  deleteAdmin,
  deleteTeacher
};