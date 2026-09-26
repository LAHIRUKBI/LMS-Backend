const Quiz = require('../models/Quizs');
const QuizSubmission = require('../models/QuizSubmission');

// The teacher prepares a quiz (with images) and sends it to the admin.
exports.createQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const { title, description, duration } = req.body;
    let questions = JSON.parse(req.body.questions || '[]');

    // Checking the images uploaded via `req.files` and providing the path for the relevant question.
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // It checks the field names 'questionImage_0' and 'questionImage_1' sent from the frontend.
        const indexParts = file.fieldname.split('_');
        if (indexParts.length === 2) {
          const qIndex = parseInt(indexParts[1], 10);
          if (questions[qIndex]) {
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
    res.status(201).json({ success: true, message: 'The question paper was successfully sent to the Admin!', quiz: newQuiz });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, error: 'A server error has occurred.' });
  }
};

exports.getPendingQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const quizzes = await Quiz.find({})
      .populate('teacherId', 'name email teacherId profilePhoto')
      .sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data retrieval error.' });
  }
};

exports.updateQuizStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const { id } = req.params;
    const { status, rejectReason } = req.body;
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { status, rejectReason: status === 'rejected' ? (rejectReason || "No reason provided") : "" },
      { new: true }
    ).populate('teacherId', 'name email teacherId profilePhoto');
    res.status(200).json({ success: true, message: `Question Paper ${status} It was done.`, quiz: updatedQuiz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};

exports.deleteQuizAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'The quiz was deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'An error.' });
  }
};

exports.getMyQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const quizzes = await Quiz.find({ teacherId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Data retrieval error.' });
  }
};

exports.publishQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    
    // frontend එකෙන් එන classIds සහ classSchedules ලබා ගැනීම
    const { classIds, classSchedules } = req.body; 
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      quiz.classIds = classIds;
      quiz.classSchedules = classSchedules || [];
      quiz.isPublished = true;
    } else {
      quiz.classIds = [];
      quiz.classSchedules = [];
      quiz.isPublished = false;
    }

    await quiz.save();
    res.status(200).json({ success: true, message: 'The quiz has been published!', quiz });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ success: false, error: 'An error.' });
  }
};

exports.deleteTeacherQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'The quiz was deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'දෝෂයක්.' });
  }
};

// Providing quizzes for a class (exported and corrected)
exports.getQuizzesByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const now = new Date(); // වර්තමාන දිනය සහ වේලාව

    // අදාළ පන්තියට publish කර ඇති සියලුම approved quizzes ලබා ගැනීම
    const allQuizzes = await Quiz.find({ 
      classIds: classId,
      isPublished: true,
      status: 'approved' 
    }).sort({ createdAt: -1 });

    // Schedule වෙලාවන්ට අනුව අදාළ කාල සීමාව තුළ පවතින quizzes පමණක් ෆිල්ටර් කර ගැනීම
    const validQuizzes = allQuizzes.filter(quiz => {
      // මෙම පන්තිය සඳහා අදාළ schedule විස්තරය සොයා ගැනීම
      const schedule = quiz.classSchedules?.find(
        sch => (sch.classId?._id?.toString() || sch.classId?.toString()) === classId.toString()
      );

      // schedule එකක් හමු නොවුණහොත් හෝ publishType එක 'now' නම් සාමාන්‍ය පරිදි පෙන්වන්න
      if (!schedule || schedule.publishType === 'now') {
        return true;
      }

      // 'schedule' කර ඇත්නම් වෙලාවන් පරීක්ෂා කිරීම
      if (schedule.publishType === 'schedule') {
        const startDateTime = schedule.startDate && schedule.startTime 
          ? new Date(`${schedule.startDate.toISOString().split('T')[0]}T${schedule.startTime}`)
          : (schedule.startDate ? new Date(schedule.startDate) : null);

        const endDateTime = schedule.endDate && schedule.endTime 
          ? new Date(`${schedule.endDate.toISOString().split('T')[0]}T${schedule.endTime}`)
          : (schedule.endDate ? new Date(schedule.endDate) : null);

        // ආරම්භක වේලාවට පසු වී තිබේද සහ අවසන් වේලාවට පෙර වී තිබේද යන්න පරීක්ෂා කිරීම
        const isAfterStart = startDateTime ? now >= startDateTime : true;
        const isBeforeEnd = endDateTime ? now <= endDateTime : true;

        return isAfterStart && isBeforeEnd;
      }

      return true;
    });

    res.json(validQuizzes);
  } catch (err) {
    console.error("An error occurred while retrieving quizzes:", err);
    res.status(500).send('Server Error');
  }
};

// Retrieving a specific quiz using the ID
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


// A student submitting a quiz
exports.submitQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const quizId = req.params.id;
    const studentId = req.user.id;
    const { answers, timeTaken } = req.body;

    const existingSub = await QuizSubmission.findOne({ quizId, studentId });
    if (existingSub) {
      return res.status(400).json({ success: false, message: 'You have already completed this quiz. It can only be taken once.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'The quiz cannot be found.' });

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
      answers,
      score: mcqScore,
      maxScore,
      isEvaluated: !hasEssay,
      timeTaken
    });

    await newSub.save();
    res.status(200).json({ success: true, message: 'Successfully presented!', score: mcqScore, maxScore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Retrieving all student submissions for the quiz assigned to the teacher.
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

// The teacher checks the paper, calculates the essay marks, and saves them.
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

        // Flexible comparison (e.g., to treat both 'b. ram' and 'ram' as correct)
        // In this instance, only the letter or the word is extracted and examined.
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

// Checking whether a student has already attempted this quiz
exports.checkQuizSubmission = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const quizId = req.params.id;
    const studentId = req.user.id;

    const submission = await QuizSubmission.findOne({ quizId, studentId });
    if (submission) {
      return res.status(200).json({ submitted: true, message: 'You have already completed this quiz.' });
    }

    res.status(200).json({ submitted: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 1. Retrieving the number of new quizzes for the sidebar
exports.getNewQuizCount = async (req, res) => {
  try {
    const count = await Quiz.countDocuments({ isNewForSidebar: true });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 2. Removing the number when the sidebar is clicked
exports.clearQuizSidebarBadge = async (req, res) => {
  try {
    await Quiz.updateMany({ isNewForSidebar: true }, { isNewForSidebar: false });
    res.json({ message: 'Sidebar badge cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// 3. Removing the dot from the card/table.
exports.clearQuizCardDot = async (req, res) => {
  try {
    await Quiz.findByIdAndUpdate(req.params.id, { isNewForTable: false });
    res.json({ message: 'Quiz card dot cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};