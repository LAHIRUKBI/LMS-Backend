const Quiz = require('../models/Quizs');
const QuizSubmission = require('../models/QuizSubmission');
const Notification = require('../models/Notification');
const Class = require('../models/Class');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');
const axios = require('axios');

// Helper function that gets the Image Buffer from Cloudinary URL or Local path
const getImageBuffer = async (url) => {
  if (!url) return null;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } else {
      const localPath = path.join(__dirname, '..', url);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    }
  } catch (err) {
    console.error("PDF Image download error:", err.message);
  }
  return null;
};

// Helper: Extracting the Public ID from a Cloudinary URL
const getCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const pathAfterUpload = parts.slice(uploadIndex + 1);
    if (pathAfterUpload[0].startsWith('v') && !isNaN(pathAfterUpload[0].substring(1))) {
      pathAfterUpload.shift();
    }
    const publicIdWithExt = pathAfterUpload.join('/');
    return publicIdWithExt.replace(/\.[^/.]+$/, "");
  } catch (e) {
    return null;
  }
};

// Teacher creating a question paper and sending it to Admin with Cloudinary images
exports.createQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const { title, description, duration } = req.body;
    let questions = JSON.parse(req.body.questions || '[]');

    // Assigning images uploaded via Cloudinary (questionImage_0, questionImage_1, etc.) to questions
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const indexParts = file.fieldname.split('_');
        if (indexParts.length === 2) {
          const qIndex = parseInt(indexParts[1], 10);
          if (questions[qIndex]) {
            questions[qIndex].imageUrl = file.path;          // Cloudinary Secure HTTPS URL
            questions[qIndex].imagePublicId = file.filename;  // Cloudinary Public ID
          }
        }
      });
    }

    // Correctly structuring question types and sub-questions in the data
    const formattedQuestions = questions.map((q) => {
      let totalMarks = q.marks || 5;

      if (q.type === 'essay' && q.subQuestions && q.subQuestions.length > 0) {
        totalMarks = q.subQuestions.reduce((sum, sq) => sum + (Number(sq.marks) || 0), 0);
      }

      return {
        type: q.type,
        questionText: q.questionText,
        imageUrl: q.imageUrl || '',
        imagePublicId: q.imagePublicId || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        marks: totalMarks,
        subQuestions: q.subQuestions || []
      };
    });

    const newQuiz = new Quiz({
      teacherId: req.user.id,
      title,
      description,
      duration,
      questions: formattedQuestions,
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

// Deleting a Quiz by an Admin (including Cloudinary images)
exports.deleteQuizAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const quiz = await Quiz.findById(req.params.id);
    if (quiz && quiz.questions) {
      for (const q of quiz.questions) {
        if (q.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(q.imagePublicId);
          } catch (delErr) {
            console.error("Cloudinary quiz image delete error:", delErr);
          }
        }
      }
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

    const { classIds, classSchedules } = req.body; 
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      quiz.classIds = classIds;
      quiz.classSchedules = classSchedules || [];
      quiz.isPublished = true;

      await quiz.save();
      try {
        const ClassRequest = require('../models/ClassRequest');

        const approvedRequests = await ClassRequest.find({
          classId: { $in: classIds },
          status: 'Approved'
        }).populate('studentId');

        for (const reqItem of approvedRequests) {
          if (reqItem.studentId) {
            await Notification.create({
              userId: reqItem.studentId._id,
              recipientRole: 'student',
              classId: reqItem.classId,
              title: '📝 A new quiz has opened!',
              message: `"${quiz.title}" A new set of questions has been added. Please log in to the class and complete it.`
            });
          }
        }
      } catch (notifErr) {
        console.error("Error creating quiz notifications for students:", notifErr);
      }

    } else {
      quiz.classIds = [];
      quiz.classSchedules = [];
      quiz.isPublished = false;
      await quiz.save();
    }

    res.status(200).json({ success: true, message: 'The quiz has been published and notifications sent successfully!', quiz });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish quiz.' });
  }
};

// Deleting a Quiz (including Cloudinary images) by a Teacher
exports.deleteTeacherQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const quiz = await Quiz.findById(req.params.id);
    if (quiz && quiz.questions) {
      for (const q of quiz.questions) {
        if (q.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(q.imagePublicId);
          } catch (delErr) {
            console.error("Cloudinary quiz image delete error:", delErr);
          }
        }
      }
    }
    await Quiz.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'The quiz was deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'An error.' });
  }
};

exports.getQuizzesByClass = async (req, res) => {
  try {
    const classId = req.params.classId;
    const now = new Date();

    const allQuizzes = await Quiz.find({ 
      classIds: classId,
      isPublished: true,
      status: 'approved' 
    }).sort({ createdAt: -1 });

    const validQuizzes = allQuizzes.filter(quiz => {
      const schedule = quiz.classSchedules?.find(
        sch => (sch.classId?._id?.toString() || sch.classId?.toString()) === classId.toString()
      );

      if (!schedule || schedule.publishType === 'now') {
        return true;
      }

      if (schedule.publishType === 'schedule') {
        const startDateTime = schedule.startDate && schedule.startTime 
          ? new Date(`${schedule.startDate.toISOString().split('T')[0]}T${schedule.startTime}`)
          : (schedule.startDate ? new Date(schedule.startDate) : null);

        const endDateTime = schedule.endDate && schedule.endTime 
          ? new Date(`${schedule.endDate.toISOString().split('T')[0]}T${schedule.endTime}`)
          : (schedule.endDate ? new Date(schedule.endDate) : null);

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

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'The quiz cannot be found.' });
    }
    res.status(200).json(quiz);
  } catch (error) {
    console.error("An error occurred while retrieving the quiz:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const quizId = req.params.id;
    const studentId = req.user.id;
    let answers = {};

    try {
      answers = req.body.answers ? JSON.parse(req.body.answers) : {};
    } catch (e) {
      answers = req.body.answers || {};
    }

    const timeTaken = req.body.timeTaken || "";

    const existingSub = await QuizSubmission.findOne({ quizId, studentId });
    if (existingSub) {
      return res.status(400).json({ success: false, message: 'You have already completed this quiz. It can only be taken once.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'The quiz cannot be found.' });

    let answerSheetsMap = {}; 
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const prefix = 'answerSheets_';
        if (file.fieldname.startsWith(prefix)) {
          const qKey = file.fieldname.replace(prefix, '');
          if (!answerSheetsMap[qKey]) {
            answerSheetsMap[qKey] = [];
          }
          // If the file path is a Cloudinary URL, it is used directly.
          answerSheetsMap[qKey].push(file.path || `/Answer_sheet/${file.filename}`);
        }
      });
    }

    let maxScore = 0;
    quiz.questions.forEach((q) => {
      maxScore += q.marks || 5;
    });

    const newSub = new QuizSubmission({
      quizId,
      studentId,
      answers,
      answerSheets: answerSheetsMap,
      score: 0,
      maxScore,
      isEvaluated: false,
      timeTaken
    });

    await newSub.save();
    res.status(200).json({ success: true, message: 'Quiz submitted successfully! Waiting for teacher evaluation.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getQuizSubmissions = async (req, res) => {
  try {
    const quizId = req.params.id;
    const submissions = await QuizSubmission.find({ quizId })
      .populate('studentId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .lean();
    res.json(submissions);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};


exports.evaluateEssay = async (req, res) => {
  try {
    const { submissionId, essayMarks, teacherCorrections, overrideScore } = req.body;
    const sub = await QuizSubmission.findById(submissionId).populate('studentId').populate('quizId');
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    sub.essayMarks = essayMarks;
    if (teacherCorrections) {
      sub.teacherCorrections = teacherCorrections;
    }

    const quiz = await Quiz.findById(sub.quizId._id || sub.quizId);

    if (overrideScore !== undefined && overrideScore !== null) {
      sub.score = Number(overrideScore) || 0;
    } else {
      let autoEvaluatedScore = 0;
      const studentAnswers = sub.answers instanceof Map ? Object.fromEntries(sub.answers) : (sub.answers || {});

      quiz.questions.forEach((q) => {
        const qId = q._id.toString();
        if (q.type === 'single' || q.type === 'short') {
          const studentAns = String(studentAnswers[qId] || "").trim().toLowerCase();
          const correctAns = String(q.correctAnswer || "").trim().toLowerCase();
          const cleanStudent = studentAns.replace(/\s+/g, '');
          const cleanCorrect = correctAns.replace(/\s+/g, '');

          if (cleanStudent === cleanCorrect || cleanStudent.includes(cleanCorrect) || cleanCorrect.includes(cleanStudent)) {
            autoEvaluatedScore += q.marks || 5;
          }
        } 
        else if (q.type === 'mcq') {
          const studentAns = studentAnswers[qId]; 
          const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];

          if (Array.isArray(studentAns)) {
            const isAllCorrect = correctAnswers.every(ans => studentAns.includes(ans)) && 
                                 studentAns.every(ans => correctAnswers.includes(ans));
            if (isAllCorrect) {
              autoEvaluatedScore += q.marks || 3;
            }
          } else if (typeof studentAns === 'string' && correctAnswers.includes(studentAns)) {
            if (correctAnswers.length === 1) {
              autoEvaluatedScore += q.marks || 3;
            }
          }
        }
      });

      let totalEssayMarks = 0;
      if (essayMarks && typeof essayMarks === 'object') {
        Object.values(essayMarks).forEach((qMarkVal) => {
          if (typeof qMarkVal === 'object' && qMarkVal !== null) {
            totalEssayMarks += Object.values(qMarkVal).reduce((sum, m) => sum + (Number(m) || 0), 0);
          } else {
            totalEssayMarks += Number(qMarkVal) || 0;
          }
        });
      }

      sub.score = autoEvaluatedScore + totalEssayMarks;
    }

    sub.isEvaluated = true;

    // Creating a PDFKit document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const pdfBuffers = [];
    doc.on('data', (chunk) => pdfBuffers.push(chunk));

    // Sinhala font
    const fontPath = path.join(__dirname, '../fonts/NotoSansSinhala-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      doc.registerFont('SinhalaFont', fontPath);
      doc.font('SinhalaFont');
    }

    const primaryColor = '#4f46e5';
    const darkText = '#0f172a';
    const mutedText = '#475569';
    const cardBg = '#f8fafc';
    const accentBg = '#e0e7ff';

    doc.rect(40, 35, 515, 55).fill(accentBg);
    doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text('QUIZ EVALUATION REPORT', 55, 50);
    doc.fillColor('#4338ca').fontSize(10).font('Helvetica').text(`${new Date().toLocaleDateString()}`, 390, 52, { align: 'right' });

    doc.moveDown(3);

    // Summary Box
    doc.rect(40, doc.y, 515, 65).fill('#ffffff').strokeColor('#cbd5e1').lineWidth(0.7).stroke();
    const boxTop = doc.y + 10;

    doc.fillColor(darkText).fontSize(10);
    doc.font('Helvetica-Bold').text('Quiz Title     : ', 55, boxTop, { continued: true }).font('SinhalaFont').text(`${quiz.title}`);
    doc.font('SinhalaFont');
    doc.text('Student Name : ', 55, boxTop + 16, { continued: true }).font('Helvetica-Bold').text(`${sub.studentId?.name || 'N/A'}`);
    doc.font('SinhalaFont');
    doc.text('Student Email : ', 55, boxTop + 32, { continued: true }).font('Helvetica').text(`${sub.studentId?.email || 'N/A'}`);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#16a34a').text(`Score: ${sub.score} / ${sub.maxScore}`, 380, boxTop + 16, { align: 'right' });

    doc.y = boxTop + 65;
    doc.moveDown(2);

    const answerSheetsObj = sub.answerSheets ? (sub.answerSheets instanceof Map ? Object.fromEntries(sub.answerSheets) : sub.answerSheets) : {};
    const savedEssayMarksObj = sub.essayMarks instanceof Map ? Object.fromEntries(sub.essayMarks) : (sub.essayMarks || {});

    // Rendering Questions and Answers
    for (let idx = 0; idx < quiz.questions.length; idx++) {
      const q = quiz.questions[idx];

      if (doc.y > 640) {
        doc.addPage();
      }

      const qId = q._id.toString();
      const studentAnswers = sub.answers instanceof Map ? Object.fromEntries(sub.answers) : (sub.answers || {});
      const rawStudentAns = studentAnswers[qId];

      let studentAnsStr = '';
      if (Array.isArray(rawStudentAns)) {
        studentAnsStr = rawStudentAns.join(', ');
      } else if (typeof rawStudentAns === 'object' && rawStudentAns !== null) {
        studentAnsStr = Object.entries(rawStudentAns).map(([k, v]) => `(${Number(k)+1}) ${v}`).join(' | ');
      } else {
        studentAnsStr = String(rawStudentAns || 'None');
      }

      let correctAnswerStr = '';
      if (Array.isArray(q.correctAnswer)) {
        correctAnswerStr = q.correctAnswer.join(', ');
      } else {
        correctAnswerStr = String(q.correctAnswer || '');
      }

      let isCorrect = false;
      if (q.type === 'single') {
        const cleanStudent = String(studentAnsStr).trim().toLowerCase().replace(/\s+/g, '');
        const cleanCorrect = correctAnswerStr.trim().toLowerCase().replace(/\s+/g, '');
        if (cleanCorrect && (cleanStudent === cleanCorrect || cleanStudent.includes(cleanCorrect) || cleanCorrect.includes(cleanStudent))) {
          isCorrect = true;
        }
      } else if (q.type === 'mcq') {
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        if (Array.isArray(rawStudentAns)) {
          isCorrect = correctArr.every((a) => rawStudentAns.includes(a)) && rawStudentAns.every((a) => correctArr.includes(a));
        } else if (typeof rawStudentAns === 'string' && correctArr.includes(rawStudentAns)) {
          if (correctArr.length === 1) isCorrect = true;
        }
      } else {
        isCorrect = true;
      }

      let qEarnedMarks = 0;
      const hasSubQ = q.subQuestions && Array.isArray(q.subQuestions) && q.subQuestions.length > 0;

      if (hasSubQ) {
        const subMarksObj = savedEssayMarksObj[qId] || {};
        if (typeof subMarksObj === 'object' && subMarksObj !== null) {
          qEarnedMarks = Object.values(subMarksObj).reduce((sum, m) => sum + (Number(m) || 0), 0);
        }
      } else if (q.type === 'essay' || q.type === 'short') {
        qEarnedMarks = Number(savedEssayMarksObj[qId]) || 0;
      } else {
        if (isCorrect) {
          qEarnedMarks = q.marks || 5;
        } else {
          qEarnedMarks = Number(savedEssayMarksObj[qId]) || 0;
        }
      }

      const feedback = (sub.teacherCorrections && typeof sub.teacherCorrections.get === 'function') 
        ? sub.teacherCorrections.get(qId) 
        : (sub.teacherCorrections?.[qId] || 'No specific feedback');

      const startY = doc.y;

      doc.rect(40, startY, 515, 18).fill(cardBg);
      doc.rect(40, startY, 4, 18).fill(primaryColor);

      doc.fillColor(darkText).fontSize(9).font('Helvetica-Bold').text(`Question ${idx + 1}`, 52, startY + 4, { continued: true });
      doc.font('Helvetica').text(`   |   Score: ${qEarnedMarks} / ${q.marks} Marks`, { continued: false });

      doc.moveDown(1.2);
      doc.fillColor('#000000').font('SinhalaFont').fontSize(11);
      doc.text(`Q: ${q.questionText}`, { indent: 10, width: 490 });
      doc.moveDown(0.4);

      // Question Image
      if (q.imageUrl) {
        const qImgData = await getImageBuffer(q.imageUrl);
        if (qImgData) {
          try {
            doc.image(qImgData, { fit: [150, 100], align: 'center' });
            doc.moveDown(0.4);
          } catch (imgErr) {
            console.error("Error adding question image:", imgErr);
          }
        }
      }

      if (hasSubQ) {
        doc.moveDown(0.2);
        q.subQuestions.forEach((sq, sqIdx) => {
          const subAns = (typeof rawStudentAns === 'object' && rawStudentAns !== null) ? (rawStudentAns[sqIdx] || 'No Answer') : '';
          const subMark = (savedEssayMarksObj[qId] && typeof savedEssayMarksObj[qId] === 'object') ? (savedEssayMarksObj[qId][sqIdx] || 0) : 0;

          doc.font('SinhalaFont').fontSize(9.5).fillColor(darkText);
          doc.text(`   (${sqIdx + 1}) ${sq.subQuestionText} [Max: ${sq.marks} Marks]`, { indent: 15, width: 480 });
          doc.font('SinhalaFont').fillColor(mutedText);
          doc.text(`       ${subAns}  (Mark: ${subMark} / ${sq.marks})`, { indent: 15, width: 480 });
          doc.moveDown(0.2);
        });
        doc.moveDown(0.3);
      } else {
        doc.font('Helvetica-Bold').fillColor(mutedText).fontSize(10).text(`Student Answer     : `, { indent: 10, continued: true });
        doc.font('SinhalaFont').fillColor(darkText).text(studentAnsStr);
        doc.moveDown(0.2);
      }

      if (correctAnswerStr && !isCorrect && !hasSubQ) {
        doc.font('Helvetica-Bold').fillColor('#16a34a').fontSize(10).text(`Correct Answer Key : `, { indent: 10, continued: true });
        doc.font('SinhalaFont').text(correctAnswerStr);
        doc.moveDown(0.2);
      }

      if ((q.type === 'mcq' || q.type === 'single') && !hasSubQ) {
        const statusText = isCorrect ? 'Correct' : 'Wrong';
        const statusColor = isCorrect ? '#16a34a' : '#dc2626';
        doc.font('Helvetica-Bold').fontSize(10).fillColor(statusColor).text(statusText, { indent: 10 });
        doc.moveDown(0.2);
      }

      // Student Uploaded Answer Sheet Images
      const qSheets = answerSheetsObj[qId] || answerSheetsObj[String(idx)] || [];
      if (Array.isArray(qSheets) && qSheets.length > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(9).text(`Student Uploaded Answer Sheet(s):`, { indent: 10 });
        doc.moveDown(0.3);

        for (const sheetUrl of qSheets) {
          if (doc.y > 540) doc.addPage();
          const sheetImgData = await getImageBuffer(sheetUrl);
          if (sheetImgData) {
            try {
              doc.image(sheetImgData, { fit: [220, 180], align: 'center' });
              doc.moveDown(0.4);
            } catch (sheetErr) {
              console.error("Error adding answer sheet image to PDF:", sheetErr);
            }
          }
        }
      }

      doc.font('Helvetica-Bold').fillColor('#0284c7').fontSize(10).text(`Teacher Feedback   : `, { indent: 10, continued: true });
      doc.font('SinhalaFont').text(feedback);

      doc.moveDown(1);
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);
    }

    doc.end();

    // Uploading the buffer to Cloudinary after the PDFKit stream has finished
    await new Promise((resolve, reject) => {
      doc.on('end', async () => {
        try {
          const finalPdfBuffer = Buffer.concat(pdfBuffers);

          if (sub.evaluatedPdfPublicId) {
            try {
              await cloudinary.uploader.destroy(sub.evaluatedPdfPublicId, { resource_type: 'raw' });
            } catch (delOldErr) {
              console.error("Error deleting previous evaluated PDF:", delOldErr);
            }
          }

          // Sending the buffer to Cloudinary as a raw upload stream
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'lms_evaluated_reports',
              resource_type: 'raw',
              format: 'pdf',
              public_id: `evaluated-${sub._id}-${Date.now()}`
            },
            async (error, result) => {
              if (error) {
                console.error("Cloudinary PDF upload error:", error);
                return reject(error);
              }
              sub.evaluatedPdfUrl = result.secure_url; // Cloudinary Secure URL
              sub.evaluatedPdfPublicId = result.public_id; // Cloudinary Public ID to delete
              await sub.save();
              resolve();
            }
          );

          uploadStream.end(finalPdfBuffer);
        } catch (streamErr) {
          reject(streamErr);
        }
      });
      doc.on('error', reject);
    });

    res.json({ success: true, message: 'Professional PDF report successfully generated & saved to Cloudinary!', sub });
  } catch (err) {
    console.error("Evaluate essay error:", err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

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

exports.getNewQuizCount = async (req, res) => {
  try {
    const count = await Quiz.countDocuments({ isNewForSidebar: true });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.clearQuizSidebarBadge = async (req, res) => {
  try {
    await Quiz.updateMany({ isNewForSidebar: true }, { isNewForSidebar: false });
    res.json({ message: 'Sidebar badge cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.clearQuizCardDot = async (req, res) => {
  try {
    await Quiz.findByIdAndUpdate(req.params.id, { isNewForTable: false });
    res.json({ message: 'Quiz card dot cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.evaluateAllMCQQuizzes = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const submissions = await QuizSubmission.find({ quizId });

    for (let sub of submissions) {
      let score = 0;
      const studentAnswers = sub.answers instanceof Map ? Object.fromEntries(sub.answers) : (sub.answers || {});

      quiz.questions.forEach((q) => {
        const qId = q._id.toString();
        if (q.type === 'single' || q.type === 'short') {
          const studentAns = String(studentAnswers[qId] || "").trim().toLowerCase();
          const correctAns = String(q.correctAnswer || "").trim().toLowerCase();

          // සිංහල හෝ ඉංග්‍රීසි අකුරු සඳහා හිස්තැන් පමණක් ඉවත් කර සංසන්දනය කිරීම
          if (studentAns.replace(/\s+/g, '') === correctAns.replace(/\s+/g, '')) {
            score += q.marks || 5;
          }
        }
      });

      sub.score = score;
      sub.isEvaluated = true;
      await sub.save();
    }

    res.status(200).json({ success: true, message: 'All MCQ student submissions evaluated and saved successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};



exports.deleteQuizSubmission = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    const sub = await QuizSubmission.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    // 1. Deleting all answer sheet images (Cloudinary or local) uploaded by the student
    if (sub.answerSheets) {
      const sheetsObj = sub.answerSheets instanceof Map ? Object.fromEntries(sub.answerSheets) : sub.answerSheets;
      for (const key of Object.keys(sheetsObj)) {
        const sheetList = sheetsObj[key];
        if (Array.isArray(sheetList)) {
          for (const sheetUrl of sheetList) {
            if (sheetUrl.startsWith('http://') || sheetUrl.startsWith('https://')) {
              const pubId = getCloudinaryPublicId(sheetUrl);
              if (pubId) {
                try {
                  await cloudinary.uploader.destroy(pubId);
                } catch (cErr) {
                  console.error("Error deleting answer sheet image from Cloudinary:", cErr);
                }
              }
            } else {
              // If it is a local file (Fallback)
              const localPath = path.join(__dirname, '..', sheetUrl);
              if (fs.existsSync(localPath)) {
                try { fs.unlinkSync(localPath); } catch (fErr) {}
              }
            }
          }
        }
      }
    }

    // 2. Deleting the evaluated PDF (Cloudinary or local)
    if (sub.evaluatedPdfPublicId) {
      try {
        await cloudinary.uploader.destroy(sub.evaluatedPdfPublicId, { resource_type: 'raw' });
      } catch (pdfCloudErr) {
        console.error("Error deleting evaluated PDF from Cloudinary:", pdfCloudErr);
      }
    } else if (sub.evaluatedPdfUrl) {
      // If it is a local file (if it was in the Answer_PDF folder)
      if (!sub.evaluatedPdfUrl.startsWith('http')) {
        const localPdfPath = path.join(__dirname, '..', sub.evaluatedPdfUrl);
        if (fs.existsSync(localPdfPath)) {
          try { fs.unlinkSync(localPdfPath); } catch (pdfErr) {}
        }
      } else {
        const pubId = getCloudinaryPublicId(sub.evaluatedPdfUrl);
        if (pubId) {
          try {
            await cloudinary.uploader.destroy(pubId, { resource_type: 'raw' });
          } catch (delErr) {}
        }
      }
    }

    // 3. Deleting the submission document from the database
    await QuizSubmission.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Student submission and associated files successfully deleted.' });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.sendSubmissionToStudent = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const sub = await QuizSubmission.findById(req.params.id).populate('quizId');
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });

    sub.isSentToStudent = true;
    await sub.save();

    await Notification.create({
      userId: sub.studentId,
      recipientRole: 'student',
      title: '📝 Quiz Results Published!',
      message: `Your teacher has evaluated and published your results for the quiz: "${sub.quizId?.title || 'Quiz'}". Score: ${sub.score}/${sub.maxScore}`
    });

    res.status(200).json({ success: true, message: 'Submission sent to student successfully!', sub });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getStudentQuizResults = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const studentId = req.user.id;
    const results = await QuizSubmission.find({ studentId, isSentToStudent: true })
      .populate('quizId', 'title description duration questions')
      .sort({ updatedAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching student results:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.sendAllSubmissionsToStudents = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }
    const quizId = req.params.quizId;
    
    const submissions = await QuizSubmission.find({ quizId }).populate('quizId');
    if (submissions.length === 0) {
      return res.status(404).json({ success: false, message: 'No submissions found for this quiz.' });
    }

    const quizTitle = submissions[0].quizId?.title || 'Quiz';

    await QuizSubmission.updateMany({ quizId }, { isSentToStudent: true });

    const notificationPromises = submissions.map(sub => {
      return Notification.create({
        userId: sub.studentId,
        recipientRole: 'student',
        title: '📝 Quiz Results Published!',
        message: `Your teacher has evaluated and published your results for the quiz: "${quizTitle}". Score: ${sub.score}/${sub.maxScore}`
      });
    });

    await Promise.all(notificationPromises);

    res.status(200).json({ success: true, message: 'All submissions sent to students and notifications created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};