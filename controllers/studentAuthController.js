const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student'); // Model එක පවතින තැන අනුව path එක වෙනස් කරගන්න

// 1. Student Registration (Email & Password)
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    let student = await Student.findOne({ email });
    if (student) {
      return res.status(400).json({ message: 'මෙම Email ලිපිනය දැනටමත් භාවිතයේ පවතී.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    student = new Student({
      name, email, phone,
      password: hashedPassword,
      authProvider: 'local'
    });

    await student.save();
    
    // කෙලින්ම ලොග් කරවීමට Token එකක් යැවීම
    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: student, message: 'ලියාපදිංචිය සාර්ථකයි!' });
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
      return res.status(400).json({ message: 'වැරදි Email ලිපිනයක් හෝ මුරපදයක්.' });
    }

    if (student.authProvider === 'google' && !student.password) {
      return res.status(400).json({ message: 'කරුණාකර Google හරහා ලොග් වන්න.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'වැරදි Email ලිපිනයක් හෝ මුරපදයක්.' });
    }

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: student, message: 'Login සාර්ථකයි!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Google Authentication Handling
exports.googleAuthStudent = async (req, res) => {
  try {
    const { name, email, googleId } = req.body;

    // සිසුවා දැනටමත් පද්ධතියේ සිටීදැයි බැලීම
    let student = await Student.findOne({ email });

    if (!student) {
      // පළමු වතාවට Google හරහා එන සිසුවෙක් නම් අලුතින් ගිණුමක් සෑදීම
      // Phone number එක පසුව Profile එකෙන් Update කරගැනීමට ඉඩ හැරිය හැක
      student = new Student({
        name,
        email,
        authProvider: 'google'
      });
      await student.save();
    }

    const payload = { user: { id: student._id, role: 'student' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: student, message: 'Google Login සාර්ථකයි!' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


// 4. Student Profile Update (PUT)
exports.updateStudentProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    // නව ක්ෂේත්‍ර ද Destructure කර ලබා ගැනීම
    const { 
      name, 
      phone, 
      address, 
      grade, 
      school, 
      country, 
      timeZone, 
      medium, 
      parentName, 
      parentPhone 
    } = req.body;

    // යාවත්කාලීන කළ යුතු දත්ත ලැයිස්තුව
    let updateData = { 
      name, 
      phone, 
      address, 
      grade, 
      school, 
      country, 
      timeZone, 
      medium, 
      parentName, 
      parentPhone 
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