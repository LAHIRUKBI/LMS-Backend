const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

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

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      // If this request originated from the login page and the student does not exist, an error is returned.
      if (!isRegister) {
        return res.status(400).json({ 
          message: 'This Google account is not registered. Please sign up first.' 
        });
      }

      // Creating a new account via the Register page
      student = new Student({
        name,
        email,
        authProvider: 'google'
      });
      await student.save();
    }

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: student, message: 'Google authentication successful!' });
  } catch (err) {
    console.error(err);
    res.status(550).send('Server Error');
  }
};


// 4. Student Profile Update (PUT)
exports.updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id; 

    const { 
      name, 
      phone, 
      address, 
      grade, 
      school, 
      country, 
      timeZone, 
      medium, 
      fatherName,
      fatherOccupation,
      fatherPhone,
      motherName,
      motherOccupation,
      motherPhone,
      hasGuardian,
      guardianName,
      guardianRelation,
      guardianPhone
    } = req.body;

    let updateData = { 
      name, 
      phone, 
      address, 
      grade, 
      school, 
      country, 
      timeZone, 
      medium, 
      fatherName,
      fatherOccupation,
      fatherPhone,
      motherName,
      motherOccupation,
      motherPhone,
      hasGuardian: hasGuardian === 'true' || hasGuardian === true,
      guardianName,
      guardianRelation,
      guardianPhone
    };

    if (req.file) {
      updateData.profileImage = `/Student_profile_photos/${req.file.filename}`;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password'); 

    if (!updatedStudent) {
      return res.status(404).json({ message: 'මෙම සිසුවා සොයාගැනීමට නොහැක.' });
    }

    res.json(updatedStudent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};