const Quiz = require('../models/Quiz');

// 1. ගුරුවරයා විසින් Quiz එකක් සකසා Admin වෙත යැවීම
exports.createQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { title, description, duration, questions } = req.body;

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

// 2. ඇඩ්මින් සඳහා අනුමැතිය අපේක්ෂිත Quiz ලැයිස්තුව ලබා ගැනීම
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
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ success: false, error: 'දත්ත ලබාගැනීමේ දෝෂයක්.' });
  }
};

// 3. ඇඩ්මින් විසින් Quiz එක Approve හෝ Reject කිරීම (හේතුව සමඟ)
exports.updateQuizStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const { id } = req.params;
    const { status, rejectReason } = req.body; // 'approved' හෝ 'rejected' සහ හේතුව

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { status, rejectReason: status === 'rejected' ? (rejectReason || "No reason provided") : "" },
      { new: true }
    ).populate('teacherId', 'name email teacherId profilePhoto');

    if (!updatedQuiz) {
      return res.status(404).json({ success: false, error: 'ප්‍රශ්න පත්‍රය හමුවී නැත.' });
    }

    res.status(200).json({ success: true, message: `ප්‍රශ්න පත්‍රය සාර්ථකව ${status} කරන ලදී.`, quiz: updatedQuiz });
  } catch (error) {
    console.error('Error updating quiz status:', error);
    res.status(500).json({ success: false, error: 'තත්ත්වය යාවත්කාලීන කිරීමේ දෝෂයක්.' });
  }
};

// 4. ඇඩ්මින් විසින් Quiz එකක් මකා දැමීම
exports.deleteQuizAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const deleted = await Quiz.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Quiz එක සොයාගත නොහැක.' });

    res.status(200).json({ success: true, message: 'Quiz එක ඇඩ්මින් විසින් මකා දමන ලදී.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'ማකා දැමීමේ දෝෂයක්.' });
  }
};

// 5. ගුරුවරයා තමන් සෑදූ quizzes ලබා ගැනීම
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

// 6. Quiz එක Publish කිරීම (Approved වූ පසු පමණි)
exports.publishQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz එක සොයාගත නොහැක.' });

    if (quiz.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    if (quiz.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'අනුමත වූ (Approved) Quiz පමණක් Publish කළ හැක.' });
    }

    quiz.isPublished = true;
    await quiz.save();

    res.status(200).json({ success: true, message: 'Quiz එක සාර්ථකව Publish කරන ලදී!', quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Publish කිරීමේ දෝෂයක්.' });
  }
};

// 7. ගුරුවරයාට තමන්ගේ Quiz එකක් මැකීමට
exports.deleteTeacherQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz එක සොයාගත නොහැක.' });

    if (quiz.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Quiz එක මකා දමන ලදී.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක් සිදුව ඇත.' });
  }
};