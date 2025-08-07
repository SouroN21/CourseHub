import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { markContentComplete } from '../config/apiConfig';

const CourseContents = () => {
  const { courseId } = useParams();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizSubmission, setQuizSubmission] = useState({}); // {quizContentId: {score, answers}}
  const [userRole, setUserRole] = useState('');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [quizAnalytics, setQuizAnalytics] = useState(null);
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultQuiz, setResultQuiz] = useState(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState({}); // {assignmentContentId: submission}
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentComments, setAssignmentComments] = useState('');
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [viewSubmissionModal, setViewSubmissionModal] = useState(false);
  const [viewSubmissionAssignment, setViewSubmissionAssignment] = useState(null);
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);
  const [instructorActiveAssignment, setInstructorActiveAssignment] = useState(null);
  const [instructorAssignmentSubmissions, setInstructorAssignmentSubmissions] = useState([]);
  const [grading, setGrading] = useState({}); // {submissionId: {grade, feedback, loading}}
  const fileInputRef = useRef();
  // Add state for delete
  const [deletingContentId, setDeletingContentId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_CONFIG.BASE_URL}/course-content/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setContents(res.data.contents))
      .catch(() => setContents([]))
      .finally(() => setLoading(false));
    // Get user role
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
      } catch {}
    }
  }, [courseId]);

  // Fetch quiz submission for each quiz on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    contents.forEach(content => {
      if (content.type === 'quiz') {
        axios.get(`${API_CONFIG.BASE_URL}/quiz-submissions/${content._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setQuizSubmission(prev => ({ ...prev, [content._id]: res.data.submission }));
        }).catch(() => {});
      }
    });
    // eslint-disable-next-line
  }, [contents]);

  // Fetch assignment submission for each assignment on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    contents.forEach(content => {
      if (content.type === 'assignment') {
        axios.get(`${API_CONFIG.BASE_URL}/assignment-submissions/${content._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setAssignmentSubmission(prev => ({ ...prev, [content._id]: res.data.submission }));
        }).catch(() => {});
      }
    });
    // eslint-disable-next-line
  }, [contents]);

  const openQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setQuizAnswers({});
    setQuizResult(null);
    setQuizModalOpen(true);
  };

  const handleQuizAnswer = (q, val) => {
    setQuizAnswers(prev => ({ ...prev, [q]: val }));
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setQuizSubmitting(true);
    const token = localStorage.getItem('token');
    const answers = (activeQuiz.questions || []).map(q => ({ question: q.question, selected: quizAnswers[q.question] || '' }));
    try {
      const res = await axios.post(`${API_CONFIG.BASE_URL}/quiz-submissions`, {
        quizContentId: activeQuiz._id,
        answers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizResult(res.data);
      setQuizSubmission(prev => ({ ...prev, [activeQuiz._id]: { score: res.data.score, answers: res.data.answers } }));
      // Mark quiz as complete for progress tracking
      try {
        await markContentComplete(courseId, activeQuiz._id, token);
        toast.success('Progress updated!');
      } catch (err) {
        toast.error('Failed to update progress');
      }
    } catch (err) {
      setQuizResult({ error: err.response?.data?.message || 'Submission failed' });
    } finally {
      setQuizSubmitting(false);
    }
  };

  const openQuizAnalytics = async (quiz) => {
    setAnalyticsQuiz(quiz);
    setQuizAnalytics(null);
    setAnalyticsModalOpen(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/quiz-submissions/analytics/${quiz._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizAnalytics(res.data);
    } catch (err) {
      setQuizAnalytics({ error: err.response?.data?.message || 'Failed to load analytics' });
    }
  };

  const openAssignmentModal = (assignment) => {
    setActiveAssignment(assignment);
    setAssignmentFile(null);
    setAssignmentComments(assignmentSubmission[assignment._id]?.comments || '');
    setAssignmentModalOpen(true);
  };

  const handleAssignmentFileChange = (e) => {
    setAssignmentFile(e.target.files[0]);
  };

  const handleAssignmentSubmit = async (e) => {
    e.preventDefault();
    setAssignmentSubmitting(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('assignmentContentId', activeAssignment._id);
    formData.append('comments', assignmentComments);
    if (assignmentFile) formData.append('file', assignmentFile);
    try {
      const res = await axios.post(`${API_CONFIG.BASE_URL}/assignment-submissions`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignmentSubmission(prev => ({ ...prev, [activeAssignment._id]: res.data.submission }));
      setAssignmentModalOpen(false);
      // Mark assignment as complete for progress tracking
      try {
        await markContentComplete(courseId, activeAssignment._id, token);
        toast.success('Progress updated!');
      } catch (err) {
        toast.error('Failed to update progress');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const openViewSubmissionModal = (assignment) => {
    setViewSubmissionAssignment(assignment);
    setViewSubmissionModal(true);
  };

  const openInstructorModal = async (assignment) => {
    setInstructorActiveAssignment(assignment);
    setInstructorModalOpen(true);
    setInstructorAssignmentSubmissions([]);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/assignment-submissions/all/${assignment._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructorAssignmentSubmissions(res.data.submissions);
    } catch {}
  };

  const handleGradeChange = (submissionId, field, value) => {
    setGrading(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], [field]: value } }));
  };

  const handleGradeSubmit = async (submissionId) => {
    setGrading(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], loading: true } }));
    const token = localStorage.getItem('token');
    const { grade, feedback } = grading[submissionId] || {};
    try {
      const res = await axios.put(`${API_CONFIG.BASE_URL}/assignment-submissions/${submissionId}/grade`, { grade, feedback }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructorAssignmentSubmissions(subs => subs.map(s => s._id === submissionId ? res.data.submission : s));
      toast.success('Grade saved!');
    } catch {
      toast.error('Failed to save grade');
    }
    setGrading(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], loading: false } }));
  };

  const handleContentViewed = async (contentId) => {
    const token = localStorage.getItem('token');
    try {
      await markContentComplete(courseId, contentId, token);
      toast.success('Progress updated!');
    } catch (err) {
      toast.error('Failed to update progress');
    }
  };

  // Delete content handler
  const handleDeleteContent = async (contentId) => {
    setDeletingContentId(contentId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_CONFIG.BASE_URL}/course-content/${contentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContents(prev => prev.filter(c => c._id !== contentId));
      toast.success('Content deleted successfully!');
      setDeleteModalOpen(false);
      setContentToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete content');
    } finally {
      setDeletingContentId(null);
    }
  };

  const openDeleteModal = (content) => {
    setContentToDelete(content);
    setDeleteModalOpen(true);
  };

  // Separate final exam from other contents
  const finalExam = contents.find(c => c.type === 'finalExam');
  const otherContents = contents.filter(c => c.type !== 'finalExam');

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Hero Header */}
      <div className="relative w-full py-16 mb-10 overflow-hidden text-white shadow-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-b-3xl">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 max-w-4xl px-4 mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 mr-4 bg-white rounded-full bg-opacity-20 backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="mb-2 text-5xl font-extrabold tracking-tight">Course Contents</h1>
          </div>
          <p className="mb-6 text-xl opacity-90">All your learning materials, quizzes, and activities in one place.</p>
          <div className="flex justify-center space-x-4">
            <div className="px-6 py-2 bg-white rounded-full bg-opacity-20 backdrop-blur-sm">
              <span className="text-sm font-semibold">{contents.length} Content Items</span>
            </div>
            <div className="px-6 py-2 bg-white rounded-full bg-opacity-20 backdrop-blur-sm">
              <span className="text-sm font-semibold">Interactive Learning</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl px-4 mx-auto">
        {/* Final Exam Section */}
        {finalExam && (
          <div className="p-6 mb-10 text-white border-4 border-red-200 shadow-lg bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl">
            <div className="flex items-center gap-4 mb-2">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-3xl font-extrabold">Final Exam</h2>
              <span className="px-4 py-1 text-lg font-bold bg-white border border-white rounded-full bg-opacity-20">Quiz</span>
            </div>
            <div className="mb-2 text-lg font-semibold">{finalExam.title}</div>
            <div className="mb-4 text-white/90">{finalExam.description}</div>
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <div className="flex-1">
                <span className="font-bold">Questions:</span> {finalExam.questions?.length || 0}
              </div>
              <div className="flex-1">
                {quizSubmission[finalExam._id] ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-3 text-green-700 border border-green-200 rounded-lg bg-green-50">
                      <span className="font-semibold">Completed</span> | Score: {quizSubmission[finalExam._id].score}/{finalExam.questions.length}
                    </div>
                    <button
                      onClick={() => { setResultQuiz(finalExam); setResultModalOpen(true); }}
                      className="px-4 py-2 font-semibold text-red-600 transition-colors bg-white rounded-lg shadow hover:bg-red-100"
                    >
                      View Results
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openQuiz(finalExam)}
                    className="px-6 py-3 font-semibold text-red-600 transition-all duration-300 bg-white rounded-lg shadow-lg hover:bg-red-100 hover:shadow-xl"
                  >
                    Take Final Exam
                  </button>
                )}
              </div>
              {userRole === 'Instructor' && (
                <button
                  onClick={() => openQuizAnalytics(finalExam)}
                  className="px-4 py-2 font-semibold text-yellow-700 transition-colors bg-yellow-100 rounded-lg hover:bg-yellow-200"
                >
                  View Analytics
                </button>
              )}
              {userRole === 'Instructor' && (
                <button
                  onClick={() => openDeleteModal(finalExam)}
                  className="px-4 py-2 font-semibold text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600"
                >
                  Delete Final Exam
                </button>
              )}
            </div>
          </div>
        )}
        {/* Other Contents Section */}
        {otherContents.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-800">No content available yet</h3>
            <p className="text-gray-600">Course materials will appear here once they're added by your instructor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {otherContents.map(content => (
              <div key={content._id} className="overflow-hidden transition-all duration-300 bg-white border border-gray-100 shadow-lg group rounded-2xl hover:shadow-2xl hover:-translate-y-2">
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg ${content.type === 'quiz' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : content.type === 'assignment' ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : content.type === 'poll' ? 'bg-gradient-to-br from-pink-500 to-rose-600' : content.type === 'survey' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : content.type === 'video' ? 'bg-gradient-to-br from-red-500 to-pink-600' : content.type === 'slide' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : content.type === 'document' ? 'bg-gradient-to-br from-gray-500 to-slate-600' : content.type === 'live' ? 'bg-gradient-to-br from-red-600 to-red-700' : content.type === 'notice' ? 'bg-gradient-to-br from-orange-500 to-yellow-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'}`}>
                      {content.type === 'quiz' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {content.type === 'assignment' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                      {content.type === 'video' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      {content.type === 'slide' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {content.type === 'document' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {content.type === 'poll' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                      {content.type === 'survey' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      )}
                      {content.type === 'live' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      {content.type === 'notice' && (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${content.type === 'quiz' ? 'bg-indigo-100 text-indigo-700' : content.type === 'assignment' ? 'bg-yellow-100 text-yellow-700' : content.type === 'poll' ? 'bg-pink-100 text-pink-700' : content.type === 'survey' ? 'bg-green-100 text-green-700' : content.type === 'video' ? 'bg-red-100 text-red-700' : content.type === 'slide' ? 'bg-blue-100 text-blue-700' : content.type === 'document' ? 'bg-gray-100 text-gray-700' : content.type === 'live' ? 'bg-red-100 text-red-700' : content.type === 'notice' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                          {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                        </span>
                      </div>
                      <p className="mb-4 text-gray-600 line-clamp-2">{content.description}</p>
                    </div>
                  </div>

                  {/* Enhanced Content Links */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {content.contentUrl && (
                      <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Content
                      </a>
                    )}
                    {content.externalLink && (
                      <a href={content.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-600 transition-colors rounded-lg bg-green-50 hover:bg-green-100">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        External Link
                      </a>
                    )}
                  </div>

                  {/* Enhanced Status Indicators */}
                  {content.noticeText && (
                    <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="font-semibold">{content.noticeText}</span>
                      </div>
                    </div>
                  )}
                  {content.liveDate && (
                    <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-center gap-2 text-green-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">Live Date: {new Date(content.liveDate).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  {content.dueDate && (
                    <div className="p-3 mb-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center gap-2 text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">Due Date: {new Date(content.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  {/* Enhanced Quiz Section */}
                  {content.type === 'quiz' && content.questions && (
                    <div className="p-4 mt-6 border border-indigo-100 bg-indigo-50 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-indigo-800">Quiz</h3>
                          <p className="text-sm text-indigo-600">{content.questions.length} questions</p>
                        </div>
                      </div>
                      {quizSubmission[content._id] ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 p-3 border border-green-200 rounded-lg bg-green-50">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold text-green-700">Completed</span>
                            </div>
                            <p className="text-sm text-green-600">Score: {quizSubmission[content._id].score}/{content.questions.length}</p>
                          </div>
                          <button
                            onClick={() => { setResultQuiz(content); setResultModalOpen(true); }}
                            className="px-4 py-2 font-semibold text-white transition-colors bg-indigo-600 rounded-lg shadow hover:bg-indigo-700"
                          >
                            View Results
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => openQuiz(content)} 
                          className="w-full px-6 py-3 font-semibold text-white transition-all duration-300 rounded-lg shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl"
                        >
                          Take Quiz
                        </button>
                      )}
                      {userRole === 'Instructor' && (
                        <button 
                          onClick={() => openQuizAnalytics(content)} 
                          className="w-full px-4 py-2 mt-3 font-semibold text-yellow-700 transition-colors bg-yellow-100 rounded-lg hover:bg-yellow-200"
                        >
                          View Analytics
                        </button>
                      )}
                    </div>
                  )}
                  {/* Enhanced Assignment Section */}
                  {content.type === 'assignment' && (
                    <div className="p-4 mt-6 border border-yellow-100 bg-yellow-50 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-yellow-800">Assignment</h3>
                          <div className="flex items-center gap-2">
                            {content.dueDate && new Date(content.dueDate) < new Date() && (
                              <span className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">Past Due</span>
                            )}
                            {assignmentSubmission[content._id] && (
                              <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">Submitted</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {content.contentUrl && (
                        <div className="mb-4">
                          <a 
                            href={content.contentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Assignment
                          </a>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {userRole !== 'Instructor' && (!assignmentSubmission[content._id] || (content.dueDate && new Date(content.dueDate) > new Date())) && (
                          <button 
                            onClick={() => openAssignmentModal(content)} 
                            className="px-4 py-2 font-semibold text-white transition-all duration-300 rounded-lg shadow bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                          >
                            {assignmentSubmission[content._id] ? 'Resubmit Assignment' : 'Submit Assignment'}
                          </button>
                        )}
                        {assignmentSubmission[content._id] && userRole !== 'Instructor' && (
                          <button 
                            onClick={() => openViewSubmissionModal(content)} 
                            className="px-4 py-2 font-semibold text-white transition-colors bg-green-500 rounded-lg shadow hover:bg-green-600"
                          >
                            View Submission
                          </button>
                        )}
                        {userRole === 'Instructor' && (
                          <button 
                            onClick={() => openInstructorModal(content)} 
                            className="px-4 py-2 font-semibold text-white transition-colors bg-yellow-500 rounded-lg shadow hover:bg-yellow-600"
                          >
                            View Submissions
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Enhanced Poll Section */}
                  {content.type === 'poll' && content.pollOptions && (
                    <div className="p-4 mt-6 border border-pink-100 bg-pink-50 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-pink-100 rounded-lg">
                          <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-pink-800">Poll</h3>
                          <p className="text-sm text-pink-600">{content.pollOptions.length} options available</p>
                        </div>
                      </div>
                      <div className="text-sm text-pink-700">
                        <span className="font-medium">Options:</span> {content.pollOptions.map(opt => opt.option).join(', ')}
                      </div>
                    </div>
                  )}
                  {/* Enhanced Survey Section */}
                  {content.type === 'survey' && content.surveyQuestions && (
                    <div className="p-4 mt-6 border border-green-100 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-800">Survey</h3>
                          <p className="text-sm text-green-600">{content.surveyQuestions.length} questions</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Add Delete button for instructors */}
                {userRole === 'Instructor' && (
                  <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                    <button
                      onClick={() => openDeleteModal(content)}
                      className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold shadow transition-colors ${deletingContentId === content._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={deletingContentId === content._id}
                    >
                      {deletingContentId === content._id ? 'Deleting...' : 'Delete Content'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <Link 
            to="/profile" 
            className="inline-flex items-center px-6 py-3 font-semibold text-white transition-all duration-300 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </Link>
        </div>
      </div>
      
      {/* Quiz Modal */}
      <Transition appear show={quizModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setQuizModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-lg p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">Quiz: {activeQuiz?.title}</Dialog.Title>
                  {quizResult && quizResult.error && (
                    <div className="mb-4 font-semibold text-red-600">{quizResult.error}</div>
                  )}
                  {quizResult && !quizResult.error ? (
                    <div>
                      <div className="mb-4 font-semibold text-green-700">Your Score: {quizResult.score} / {activeQuiz.questions.length}</div>
                      <ul className="space-y-2">
                        {quizResult.answers.map((a, idx) => (
                          <li key={idx} className={a.isCorrect ? 'text-green-700' : 'text-red-600'}>
                            <span className="font-semibold">Q:</span> {a.question}<br />
                            <span className="font-semibold">Your Answer:</span> {a.selected || <span className="italic text-gray-400">No answer</span>}<br />
                            <span className="font-semibold">Correct:</span> {a.correct}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end mt-6">
                        <button onClick={() => setQuizModalOpen(false)} className="px-4 py-2 text-white bg-blue-600 rounded">Close</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleQuizSubmit} className="space-y-6">
                      {activeQuiz?.questions?.map((q, idx) => (
                        <div key={idx} className="mb-4">
                          <div className="mb-2 font-semibold">Q{idx + 1}: {q.question}</div>
                          <div className="space-y-1">
                            {q.options.map((opt, oidx) => (
                              <label key={oidx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`q_${idx}`}
                                  value={opt}
                                  checked={quizAnswers[q.question] === opt}
                                  onChange={() => handleQuizAnswer(q.question, opt)}
                                  className="text-blue-600 form-radio"
                                  required
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setQuizModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded" disabled={quizSubmitting}>{quizSubmitting ? 'Submitting...' : 'Submit Quiz'}</button>
                      </div>
                    </form>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Quiz Results Modal */}
      <Transition appear show={resultModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setResultModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-lg p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">Quiz Results: {resultQuiz?.title}</Dialog.Title>
                  {resultQuiz && quizSubmission[resultQuiz._id] && (
                    <div>
                      <div className="mb-4 font-semibold text-green-700">
                        Your Score: {quizSubmission[resultQuiz._id].score} / {resultQuiz.questions.length}
                      </div>
                      <ul className="space-y-2">
                        {quizSubmission[resultQuiz._id].answers.map((a, idx) => (
                          <li key={idx} className={a.isCorrect ? 'text-green-700' : 'text-red-600'}>
                            <span className="font-semibold">Q:</span> {a.question}<br />
                            <span className="font-semibold">Your Answer:</span> {a.selected || <span className="italic text-gray-400">No answer</span>}<br />
                            <span className="font-semibold">Correct:</span> {a.correct}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end mt-6">
                        <button onClick={() => setResultModalOpen(false)} className="px-4 py-2 text-white bg-blue-600 rounded">Close</button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Assignment Submission Modal (Student) */}
      <Transition appear show={assignmentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setAssignmentModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-lg p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">{assignmentSubmission[activeAssignment?._id] ? 'Resubmit Assignment' : 'Submit Assignment'}</Dialog.Title>
                  <form onSubmit={handleAssignmentSubmit} className="space-y-6">
                    <div>
                      <label className="block mb-1 font-medium">Upload File</label>
                      <input type="file" ref={fileInputRef} onChange={handleAssignmentFileChange} className="w-full" required={!assignmentSubmission[activeAssignment?._id]} />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium">Comments/Answer</label>
                      <textarea value={assignmentComments} onChange={e => setAssignmentComments(e.target.value)} className="w-full px-3 py-2 border rounded" rows="4" placeholder="Add any comments or your answer here..." />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button type="button" onClick={() => setAssignmentModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                      <button type="submit" className="px-4 py-2 font-semibold text-indigo-900 bg-yellow-400 rounded" disabled={assignmentSubmitting}>{assignmentSubmitting ? 'Submitting...' : assignmentSubmission[activeAssignment?._id] ? 'Resubmit' : 'Submit'}</button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* View Submission Modal (Student) */}
      <Transition appear show={viewSubmissionModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setViewSubmissionModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-lg p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">Your Submission</Dialog.Title>
                  {assignmentSubmission[viewSubmissionAssignment?._id] ? (
                    <div className="space-y-4">
                      <div><span className="font-semibold">File:</span> <a href={assignmentSubmission[viewSubmissionAssignment._id].fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a></div>
                      <div><span className="font-semibold">Comments:</span> {assignmentSubmission[viewSubmissionAssignment._id].comments || <span className="italic text-gray-400">None</span>}</div>
                      <div><span className="font-semibold">Submitted At:</span> {new Date(assignmentSubmission[viewSubmissionAssignment._id].submittedAt).toLocaleString()}</div>
                      {assignmentSubmission[viewSubmissionAssignment._id].grade !== undefined && (
                        <div><span className="font-semibold">Grade:</span> <span className="font-bold text-green-700">{assignmentSubmission[viewSubmissionAssignment._id].grade}</span></div>
                      )}
                      {assignmentSubmission[viewSubmissionAssignment._id].feedback && (
                        <div><span className="font-semibold">Feedback:</span> {assignmentSubmission[viewSubmissionAssignment._id].feedback}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600">No submission found.</div>
                  )}
                  <div className="flex justify-end mt-6">
                    <button onClick={() => setViewSubmissionModal(false)} className="px-4 py-2 text-white bg-blue-600 rounded">Close</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Instructor View Submissions Modal */}
      <Transition appear show={instructorModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setInstructorModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-2xl p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">Assignment Submissions: {instructorActiveAssignment?.title}</Dialog.Title>
                  {instructorAssignmentSubmissions.length === 0 ? (
                    <div className="text-gray-600">No submissions yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full overflow-hidden text-xs bg-white border rounded-xl">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 border">Student</th>
                            <th className="px-4 py-2 border">File</th>
                            <th className="px-4 py-2 border">Comments</th>
                            <th className="px-4 py-2 border">Submitted At</th>
                            <th className="px-4 py-2 border">Grade</th>
                            <th className="px-4 py-2 border">Feedback</th>
                            <th className="px-4 py-2 border">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {instructorAssignmentSubmissions.map((s) => {
                            const isGraded = s.grade !== undefined && s.grade !== null && s.grade !== '';
                            const changed = grading[s._id]?.grade !== undefined && grading[s._id]?.grade !== s.grade || grading[s._id]?.feedback !== undefined && grading[s._id]?.feedback !== s.feedback;
                            return (
                              <tr key={s._id} className={isGraded ? 'bg-green-50' : ''}>
                                <td className="px-4 py-2 border">{s.student?.firstName} {s.student?.lastName}<br /><span className="text-xs text-gray-500">{s.student?.email}</span></td>
                                <td className="px-4 py-2 border"><a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a></td>
                                <td className="px-4 py-2 border">{s.comments || <span className="italic text-gray-400">None</span>}</td>
                                <td className="px-4 py-2 border">{new Date(s.submittedAt).toLocaleString()}</td>
                                <td className="px-4 py-2 border">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      className="w-16 px-2 py-1 border rounded"
                                      value={grading[s._id]?.grade ?? s.grade ?? ''}
                                      onChange={e => handleGradeChange(s._id, 'grade', e.target.value)}
                                    />
                                    {isGraded && <span className="ml-1 font-bold text-green-700">✓</span>}
                                  </div>
                                  {!isGraded && <div className="text-xs text-gray-400">Not graded</div>}
                                </td>
                                <td className="px-4 py-2 border">
                                  <input
                                    type="text"
                                    className="w-32 px-2 py-1 border rounded"
                                    value={grading[s._id]?.feedback ?? s.feedback ?? ''}
                                    onChange={e => handleGradeChange(s._id, 'feedback', e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-2 border">
                                  <button
                                    onClick={() => handleGradeSubmit(s._id)}
                                    className={`px-3 py-1 bg-blue-600 text-white rounded text-xs ${!changed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={grading[s._id]?.loading || !changed}
                                  >
                                    {grading[s._id]?.loading ? 'Saving...' : 'Save'}
                                  </button>
                                  {s.gradedBy && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      By: {s.gradedBy?.name || s.gradedBy?.email || s.gradedBy}<br />
                                      {s.gradedAt && new Date(s.gradedAt).toLocaleString()}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex justify-end mt-6">
                    <button onClick={() => setInstructorModalOpen(false)} className="px-4 py-2 text-white bg-blue-600 rounded">Close</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Quiz Analytics Modal (Instructor) */}
      <Transition appear show={analyticsModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setAnalyticsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-2xl p-8 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold">Quiz Analytics: {analyticsQuiz?.title}</Dialog.Title>
                  {quizAnalytics && quizAnalytics.error && (
                    <div className="mb-4 font-semibold text-red-600">{quizAnalytics.error}</div>
                  )}
                  {quizAnalytics && !quizAnalytics.error ? (
                    <div>
                      <div className="mb-4 font-semibold text-green-700">Total Submissions: {quizAnalytics.totalSubmissions}</div>
                      <div className="mb-4 font-semibold text-blue-700">Average Score: {quizAnalytics.averageScore?.toFixed(2)}</div>
                      {/* Per-question stats */}
                      {quizAnalytics.questionStats && quizAnalytics.questionStats.length > 0 && (
                        <div className="mb-6">
                          <h3 className="mb-2 text-lg font-bold text-indigo-700">Per-Question Stats</h3>
                          <ul className="space-y-2">
                            {quizAnalytics.questionStats.map((qs, idx) => (
                              <li key={idx} className="p-3 border rounded bg-gray-50">
                                <div className="font-semibold">Q{idx + 1}: {qs.question}</div>
                                <div className="text-green-700">Correct: {qs.correct}</div>
                                <div className="text-red-700">Incorrect: {qs.incorrect}</div>
                                {qs.mostCommonWrong && (
                                  <div className="text-yellow-700">Most Common Wrong Answer: {qs.mostCommonWrong}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="overflow-x-auto">
                        <table className="min-w-full overflow-hidden bg-white border rounded-xl">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 border">Student</th>
                              <th className="px-4 py-2 border">Score</th>
                              <th className="px-4 py-2 border">Submitted At</th>
                              <th className="px-4 py-2 border">Answers</th>
                            </tr>
                          </thead>
                          <tbody>
                            {quizAnalytics.submissions.map((s, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 border">{s.student?.firstName} {s.student?.lastName} <br /><span className="text-xs text-gray-500">{s.student?.email}</span></td>
                                <td className="px-4 py-2 border">{s.score}</td>
                                <td className="px-4 py-2 border">{new Date(s.submittedAt).toLocaleString()}</td>
                                <td className="px-4 py-2 border">
                                  <ul className="text-xs">
                                    {s.answers.map((a, i) => (
                                      <li key={i} className={a.isCorrect ? 'text-green-700' : 'text-red-600'}>
                                        <span className="font-semibold">Q:</span> {a.question}<br />
                                        <span className="font-semibold">Ans:</span> {a.selected || <span className="italic text-gray-400">No answer</span>}<br />
                                        <span className="font-semibold">Correct:</span> {a.correct}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end mt-6">
                        <button onClick={() => setAnalyticsModalOpen(false)} className="px-4 py-2 text-white bg-blue-600 rounded">Close</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600">Loading...</div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
      
      {/* Delete Confirmation Modal */}
      <Transition appear show={deleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setDeleteModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="relative w-full max-w-md p-6 mx-auto bg-white rounded-lg shadow-xl">
                  <Dialog.Title className="mb-4 text-xl font-bold text-red-600">
                    Delete Content
                  </Dialog.Title>
                  <div className="mb-6">
                    <p className="mb-2 text-gray-700">
                      Are you sure you want to delete this content?
                    </p>
                    <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                      <p className="font-semibold text-red-800">{contentToDelete?.title}</p>
                      <p className="text-sm text-red-600">{contentToDelete?.type} • {contentToDelete?.description}</p>
                    </div>
                    <p className="mt-2 text-sm text-red-600">
                      This action cannot be undone. All associated data will be permanently deleted.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      className="px-4 py-2 font-semibold text-gray-800 transition-colors bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteContent(contentToDelete?._id)}
                      disabled={deletingContentId === contentToDelete?._id}
                      className={`px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-colors ${deletingContentId === contentToDelete?._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {deletingContentId === contentToDelete?._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default CourseContents;