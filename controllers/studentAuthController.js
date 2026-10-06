const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const fs = require('fs');
const path = require('path');

// 1. Student Registration (Email & Password)
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    let student = await Student.findOne({ email });
    if (student) {
      return res.status(400).json({ message: 'This email address is already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    student = new Student({
      name, email, phone,
      password: hashedPassword,
      authProvider: 'local'
    });

    await student.save();
    
    // Sending a token for direct login
    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: student, message: 'Registration successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. Student Login (Email & Password)
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    let student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: 'Incorrect email address or password.' });
    }

    if (student.authProvider === 'google' && !student.password) {
      return res.status(400).json({ message: 'Please log in via Google.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect email address or password.' });
    }

    // Updating `isOnline: true` in the database as soon as the child logs in.
    student.isOnline = true;
    await student.save();

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Emitting a socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('student_online', { studentId: student._id, isOnline: true });
    }

    res.json({ token, user: student, message: 'Login successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Google Authentication Handling
exports.googleAuthStudent = async (req, res) => {
  try {
    const { name, email, googleId, isRegister } = req.body;

    let student = await Student.findOne({ email });

    if (!student) {
      if (!isRegister) {
        return res.status(400).json({ 
          message: 'This Google account is not registered. Please sign up first.' 
        });
      }

      student = new Student({
        name,
        email,
        authProvider: 'google'
      });
      await student.save();
    }
    // Updating `isOnline: true` in the database immediately upon logging in via Google.
    student.isOnline = true;
    await student.save();

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Emitting a socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('student_online', { studentId: student._id, isOnline: true });
    }

    res.json({ token, user: student, message: 'Google authentication successful!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// 4. Student Profile Update (PUT)
exports.updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id; 

    // First, retrieve the existing student's details (to delete the old photo).
    const existingStudent = await Student.findById(userId);
    if (!existingStudent) {
      return res.status(404).json({ message: 'This student cannot be found.' });
    }

    const { 
      name, phone, address, grade, school, country, timeZone, medium, 
      fatherName, fatherOccupation, fatherPhone, motherName, motherOccupation, 
      motherPhone, hasGuardian, guardianName, guardianRelation, guardianPhone 
    } = req.body;

    let updateData = { 
      name, phone, address, grade, school, country, timeZone, medium, 
      fatherName, fatherOccupation, fatherPhone, motherName, motherOccupation, 
      motherPhone, hasGuardian: hasGuardian === 'true' || hasGuardian === true, 
      guardianName, guardianRelation, guardianPhone 
    };

    // If a new picture has been uploaded
    if (req.file) {
      // Deleting an old picture
      if (existingStudent.profileImage) {
        const oldImagePath = path.join(__dirname, '..', existingStudent.profileImage);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath); //The old photo is being demoed.
          } catch (err) {
            console.error("Error deleting old profile image:", err);
          }
        }
      }
      updateData.profileImage = `/Student_profile_photos/${req.file.filename}`;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password'); 

    res.json(updatedStudent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 5. Student Logout (isOnline: false කිරීම සඳහා)
exports.logoutStudent = async (req, res) => {
  try {
    const studentId = req.body.studentId || (req.user ? req.user.id : null);
    if (studentId) {
      await Student.findByIdAndUpdate(studentId, { isOnline: false });
      
      const io = req.app.get('io');
      if (io) {
        io.emit('student_online', { studentId, isOnline: false });
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).send('Server Error');
  }
};

// To go offline immediately upon closing the tab
exports.forceOfflineStudent = async (req, res) => {
  try {
    // Retrieving the studentId from req.body, req.query, or req.params
    const studentId = req.body?.studentId || req.query?.studentId || req.body;
    
    // To handle plain text received via sendBeacon
    let finalStudentId = studentId;
    if (typeof req.body === 'string' && req.body.startsWith('studentId=')) {
      finalStudentId = req.body.split('=')[1];
    }

    if (finalStudentId) {
      await Student.findByIdAndUpdate(finalStudentId, { isOnline: false });
      
      const io = req.app.get('io');
      if (io) {
        io.emit('student_online', { studentId: finalStudentId, isOnline: false });
      }
    }
    res.status(200).send("OK");
  } catch (err) {
     console.error("Force offline error:", err);
     res.status(500).send();
  }
};