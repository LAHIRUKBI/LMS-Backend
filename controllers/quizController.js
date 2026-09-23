const Quiz = require('../models/Quizs');

// ගුරුවරයා විසින් Quiz එකක් (රූප සමඟ) සකසා Admin වෙත යැවීම
exports.createQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { title, description, duration } = req.body;
    let questions = JSON.parse(req.body.questions || '[]');

    // req.files හරහා උඩුගත වූ පින්තූර පරීක්ෂා කර අදාළ ප්‍රශ්නයට path එක ලබා දීම
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Frontend එකෙන් 'questionImage_0', 'questionImage_1' ලෙස එවන fieldname එක පරීක්ෂා කරයි
        const indexParts = file.fieldname.split('_');
        if (indexParts.length === 2) {
          const qIndex = parseInt(indexParts[1], 10);
          if (questions[qIndex]) {
            // MongoDB එකේ සේව් වන ආකෘතිය: /Quize_images/file_name.png
            questions[qIndex].imageUrl = `/Quize_images/${file.filename}`;
          }
        }
      });
    }

    const newQuiz = new Quiz({
      teacherId: req.user.id,
      title,
      description,
      duration,
      questions,
      status: 'pending'
    });

    await newQuiz.save();
    res.status(201).json({ success: true, message: 'ප්‍රශ්න පත්‍රය සාර්ථකව Admin වෙත යවන ලදී!', quiz: newQuiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, error: 'සර්වර් දෝෂයක් සිදුව ඇත.' });
  }
};

exports.getPendingQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const quizzes = await Quiz.find({})
      .populate('teacherId', 'name email teacherId profilePhoto')
      .sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
  }
};

exports.updateQuizStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const { id } = req.params;
    const { status, rejectReason } = req.body;
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { status, rejectReason: status === 'rejected' ? (rejectReason || "No reason provided") : "" },
      { new: true }
    ).populate('teacherId', 'name email teacherId profilePhoto');
    res.status(200).json({ success: true, message: `ප්‍රශ්න පත්‍රය ${status} කරන ලදී.`, quiz: updatedQuiz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};

exports.deleteQuizAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Quiz එක මකා දමන ලදී.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};

exports.getMyQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const quizzes = await Quiz.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
  }
};

exports.publishQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const quiz = await Quiz.findById(req.params.id);
    quiz.isPublished = true;
    await quiz.save();
    res.status(200).json({ success: true, message: 'Quiz එක Publish කරන ලදී!', quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};

exports.deleteTeacherQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Quiz එක මකා දමන ලදී.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};