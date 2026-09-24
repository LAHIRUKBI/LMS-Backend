const Quiz = require('../models/Quizs');
const QuizSubmission = require('../models/QuizSubmission');

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
    
    // Materials වල මෙන්ම පන්ති වලට publish කිරීමට classIds ලබා ගැනීම
    const { classIds } = req.body; 
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      quiz.classIds = classIds;
      quiz.isPublished = true;
    } else {
      quiz.classIds = [];
      quiz.isPublished = false;
    }

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

// පන්තියකට අදාළ Quizzes ලබා දීම (Export කර නිවැරදි කළා)
exports.getQuizzesByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    
    // Quizs වෙනුවට Quiz භාවිතා කර ඇත. අනුමත (approved) වූ ඒවා පමණක් යවයි
    const quizzes = await Quiz.find({ 
      classIds: classId,
      isPublished: true,
      status: 'approved' 
    }).sort({ createdAt: -1 });

    res.json(quizzes);
  } catch (err) {
    console.error("Quizzes ලබා ගැනීමේ දෝෂයක්:", err);
    res.status(500).send('Server Error');
  }
};

// ID එක මඟින් නිශ්චිත Quiz එකක් ලබා ගැනීම
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz එක සොයාගත නොහැක.' });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error("Quiz ලබා ගැනීමේ දෝෂයක්:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


// සිසුවෙකු විසින් Quiz එකක් Submit කිරීම
exports.submitQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const quizId = req.params.id;
    const studentId = req.user.id;
    const { answers, timeTaken } = req.body;

    const existingSub = await QuizSubmission.findOne({ quizId, studentId });
    if (existingSub) {
      return res.status(400).json({ success: false, message: 'ඔබ දැනටමත් මෙම Quiz එක සම්පූර්ණ කර ඇත. එය කළ හැක්කේ එක් වරක් පමණි.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz එක සොයාගත නොහැක.' });

    let mcqScore = 0;
    let maxScore = 0;
    let hasEssay = false;

    quiz.questions.forEach((q) => {
      const qId = q._id.toString();
      maxScore += q.marks || 5;
      if (q.type === 'mcq' || q.type === 'short') {
        const studentAns = answers[qId] || "";
        if (studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
          mcqScore += q.marks || 5;
        }
      } else if (q.type === 'essay') {
        hasEssay = true;
      }
    });

    const newSub = new QuizSubmission({
      quizId,
      studentId,
      answers, // plain object ලෙස save වේ
      score: mcqScore,
      maxScore,
      isEvaluated: !hasEssay,
      timeTaken
    });

    await newSub.save();
    res.status(200).json({ success: true, message: 'සාර්ථකව ඉදිරිපත් කරන ලදී!', score: mcqScore, maxScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// ගුරුවරයාට අදාළ Quiz එකේ සියලුම Student Submissions ලබා ගැනීම
exports.getQuizSubmissions = async (req, res) => {
  try {
    const quizId = req.params.id;
    const submissions = await QuizSubmission.find({ quizId })
      .populate('studentId', 'name email profileImage')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// ගුරුවරයා විසින් Paper එක චෙක් කිරීම සහ Essay ලකුණු Calculate කර Save කිරීම
exports.evaluateEssay = async (req, res) => {
  try {
    const { submissionId, essayMarks } = req.body; 
    const sub = await QuizSubmission.findById(submissionId);
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    sub.essayMarks = essayMarks;
    
    const quiz = await Quiz.findById(sub.quizId);
    let mcqOnlyScore = 0;

    const studentAnswers = sub.answers instanceof Map ? Object.fromEntries(sub.answers) : (sub.answers || {});

    quiz.questions.forEach((q) => {
      const qId = q._id.toString();
      if (q.type === 'mcq' || q.type === 'short') {
        const studentAns = String(studentAnswers[qId] || "").trim().toLowerCase();
        const correctAns = String(q.correctAnswer || "").trim().toLowerCase();

        // නම්‍යශීලී ලෙස සංසන්දනය කිරීම (උදා: 'b. ram' හෝ 'ram' යන දෙකම නිවැරදි ලෙස ගැනීම සඳහා)
        // මෙහිදී අකුර පමණක් හෝ වචනය පමණක් උපුටාගෙන පරීක්ෂා කරයි
        const cleanStudent = studentAns.replace(/[^a-z0-9]/g, '');
        const cleanCorrect = correctAns.replace(/[^a-z0-9]/g, '');

        if (cleanStudent === cleanCorrect || cleanStudent.includes(cleanCorrect) || cleanCorrect.includes(cleanStudent)) {
          mcqOnlyScore += q.marks || 5;
        }
      }
    });

    let totalEssayMarks = 0;
    if (essayMarks) {
      totalEssayMarks = Object.values(essayMarks).reduce((a, b) => Number(a) + Number(b), 0);
    }

    sub.score = mcqOnlyScore + totalEssayMarks;
    sub.isEvaluated = true;
    await sub.save();

    res.json({ success: true, message: 'ලකුණු සාර්ථකව ගණනය කර සේව් කරන ලදී!', sub });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// සිසුවෙක් දැනටමත් මෙම Quiz එක කර ඇද්දැයි පරීක්ෂා කිරීම
exports.checkQuizSubmission = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'අවසර ප්‍රතික්ෂේප විය.' });
    }

    const quizId = req.params.id;
    const studentId = req.user.id;

    const submission = await QuizSubmission.findOne({ quizId, studentId });
    if (submission) {
      return res.status(200).json({ submitted: true, message: 'ඔබ දැනටමත් මෙම Quiz එක සම්පූර්ණ කර ඇත.' });
    }

    res.status(200).json({ submitted: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};