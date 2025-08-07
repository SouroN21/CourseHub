import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { saveAs } from 'file-saver';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InstructorCourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState([]);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [contentForm, setContentForm] = useState({
    type: '',
    title: '',
    description: '',
    file: null,
    contentUrl: '',
    liveDate: '',
    dueDate: '',
    noticeText: '',
    externalLink: '',
    questions: '',
    pollOptions: '',
    surveyQuestions: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizResultsModal, setQuizResultsModal] = useState({ open: false, quiz: null, analytics: null });
  const [quizViewModal, setQuizViewModal] = useState({ open: false, quiz: null });
  const [instructorModalOpen, setInstructorModalOpen] = useState(false);
  const [instructorActiveAssignment, setInstructorActiveAssignment] = useState(null);
  const [instructorAssignmentSubmissions, setInstructorAssignmentSubmissions] = useState([]);
  const [grading, setGrading] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    axios.get(`${API_CONFIG.BASE_URL}/courses/${courseId}`)
      .then(res => setCourse(res.data.course))
      .catch(() => setCourse(null));
    axios.get(`${API_CONFIG.BASE_URL}/enrollments/analytics/course/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setAnalytics(res.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [courseId, navigate]);

  // Fetch course contents
  useEffect(() => {
    if (!course?._id) return;
    const token = localStorage.getItem('token');
    axios.get(`${API_CONFIG.BASE_URL}/course-content/course/${course._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setContents(res.data.contents)).catch(() => setContents([]));
  }, [course]);

  const revenueData = React.useMemo(() => analytics?.dailyRevenue || [], [analytics]);
  const enrollData = React.useMemo(() => analytics?.dailyEnrollments || [], [analytics]);

  const handleExportCSV = () => {
    if (!analytics?.students) return;
    const header = 'Name,Email,Enrolled At,Payment,Country,Progress,Certificate Issued\n';
    const rows = analytics.students.map(s =>
      `"${s.name}","${s.email}","${new Date(s.enrolledAt).toLocaleString()}","${s.paymentStatus}","${s.country || ''}",${s.progress},${s.certificateIssued}`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `course_${courseId}_students.csv`);
  };

  const handleContentFormChange = (e) => {
    const { name, value, files } = e.target;
    setContentForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleAddQuestion = () => {
    setQuizQuestions(prev => [...prev, { question: '', options: ['', ''], answer: '' }]);
  };

  const handleRemoveQuestion = (idx) => {
    setQuizQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, value) => {
    setQuizQuestions(prev => prev.map((q, i) => i === idx ? { ...q, question: value } : q));
  };

  const handleOptionChange = (qIdx, oIdx, value) => {
    setQuizQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((opt, j) => j === oIdx ? value : opt) } : q));
  };

  const handleAddOption = (qIdx) => {
    setQuizQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, ''] } : q));
  };

  const handleRemoveOption = (qIdx, oIdx) => {
    setQuizQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q));
  };

  const handleAnswerChange = (qIdx, value) => {
    setQuizQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, answer: value } : q));
  };

  useEffect(() => {
    if (isContentModalOpen && contentForm.type === 'quiz') {
      setQuizQuestions([]);
    }
    // eslint-disable-next-line
  }, [isContentModalOpen, contentForm.type]);

  const handleAddContent = async (e) => {
    e.preventDefault();
    let formValues = { ...contentForm };
    if (contentForm.type === 'quiz') {
      formValues.questions = JSON.stringify(quizQuestions);
    }
    setSubmitting(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    formData.append('course', course._id);
    try {
      await axios.post(`${API_CONFIG.BASE_URL}/course-content`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsContentModalOpen(false);
      setContentForm({ type: '', title: '', description: '', file: null, contentUrl: '', liveDate: '', dueDate: '', noticeText: '', externalLink: '', questions: '', pollOptions: '', surveyQuestions: '' });
      // Refresh content list
      axios.get(`${API_CONFIG.BASE_URL}/course-content/course/${course._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setContents(res.data.contents)).catch(() => setContents([]));
    } catch (err) {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewQuizResults = async (quiz) => {
    setQuizResultsModal({ open: true, quiz, analytics: null });
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/quiz-submissions/analytics/${quiz._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizResultsModal({ open: true, quiz, analytics: res.data });
    } catch (err) {
      setQuizResultsModal({ open: true, quiz, analytics: { error: 'Failed to load results' } });
    }
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

  if (loading) return <div className="p-8">Loading...</div>;
  if (!course) return <div className="p-8 text-red-600">Course not found.</div>;

  return (
    <>
      <div className="min-h-screen px-4 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-extrabold text-primary mb-2">{course.title}</h1>
          <p className="mb-2 text-gray-700">{course.description}</p>
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="inline-block bg-primary text-white px-3 py-1 rounded-full text-sm font-semibold">{course.category}</span>
            <span className="inline-block bg-yellow-400 text-indigo-900 px-3 py-1 rounded-full text-sm font-semibold">{course.level}</span>
            <span className="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">${course.price}</span>
            <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">Created: {new Date(course.createdAt).toLocaleDateString()}</span>
          </div>
          {course.coverImage && <img src={course.coverImage} alt={course.title} className="w-full h-64 object-cover rounded-lg my-4" />}
          {analytics && (
            <div className="my-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-6 shadow flex flex-col items-center">
                  <span className="text-lg font-semibold mb-1">Total Earnings</span>
                  <span className="text-3xl font-bold">${analytics.earnings?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="bg-gradient-to-r from-indigo-500 to-blue-400 text-white rounded-xl p-6 shadow flex flex-col items-center">
                  <span className="text-lg font-semibold mb-1">Total Enrollments</span>
                  <span className="text-3xl font-bold">{analytics.total}</span>
                </div>
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl p-6 shadow flex flex-col items-center">
                  <span className="text-lg font-semibold mb-1">Completion Rate</span>
                  <span className="text-3xl font-bold">{analytics.completionRate?.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 shadow">
                  <div className="text-center text-base font-semibold mb-2 text-primary">Revenue Over Time</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 shadow">
                  <div className="text-center text-base font-semibold mb-2 text-primary">Enrollments Over Time</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={enrollData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex justify-end mb-4">
                <button onClick={handleExportCSV} className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary transition">Export Students CSV</button>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mt-8 mb-4">
            <h2 className="text-xl font-bold">Course Contents</h2>
            <button onClick={() => setIsContentModalOpen(true)} className="px-4 py-2 bg-primary text-white rounded hover:bg-secondary">Add Content</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {contents.map(content => (
              <div key={content._id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-primary">{content.title}</span>
                  {/* Add edit/delete buttons here if needed */}
                </div>
                <div className="text-sm text-gray-600 mb-1">Type: {content.type}</div>
                <div className="text-gray-700 mb-2">{content.description}</div>
                {/* Render contentUrl, noticeText, etc. as appropriate */}
                {content.contentUrl && <a href={content.contentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View Content</a>}
                {content.externalLink && <a href={content.externalLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">External Link</a>}
                {content.noticeText && <div className="mt-2 text-yellow-700">Notice: {content.noticeText}</div>}
                {/* Quiz Results and View Quiz Buttons */}
                {content.type === 'quiz' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleViewQuizResults(content)}
                      className="px-3 py-1 bg-primary text-white rounded hover:bg-secondary text-xs"
                    >
                      View Results
                    </button>
                    <button
                      onClick={() => setQuizViewModal({ open: true, quiz: content })}
                      className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-xs"
                    >
                      View Quiz
                    </button>
                  </div>
                )}
                {content.type === 'assignment' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openInstructorModal(content)}
                      className="px-3 py-1 bg-yellow-400 text-indigo-900 rounded hover:bg-yellow-500 text-xs font-semibold shadow"
                    >
                      View Submissions
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="my-6">
            <h2 className="text-xl font-bold mb-2">Enrolled Students</h2>
            {!analytics?.students?.length ? (
              <p>No students enrolled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded-xl overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-4 py-2">Name</th>
                      <th className="border px-4 py-2">Email</th>
                      <th className="border px-4 py-2">Payment</th>
                      <th className="border px-4 py-2">Enrolled At</th>
                      <th className="border px-4 py-2">Country</th>
                      <th className="border px-4 py-2">Progress</th>
                      <th className="border px-4 py-2">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.students.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="border px-4 py-2">{s.name}</td>
                        <td className="border px-4 py-2">{s.email}</td>
                        <td className="border px-4 py-2">{s.paymentStatus}</td>
                        <td className="border px-4 py-2">{new Date(s.enrolledAt).toLocaleString()}</td>
                        <td className="border px-4 py-2">{s.country || '-'}</td>
                        <td className="border px-4 py-2">{s.progress}%</td>
                        <td className="border px-4 py-2">{s.certificateIssued ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Link to="/instructor/profile" className="text-primary hover:underline">Back to Profile</Link>
        </div>
      </div>
      {/* Add Content Modal */}
      <Transition appear show={isContentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsContentModalOpen(false)}>
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
                <Dialog.Panel className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto p-8">
                  <Dialog.Title className="text-xl font-bold mb-4">Add Course Content</Dialog.Title>
                  <form onSubmit={handleAddContent} className="space-y-4">
                    <div>
                      <label className="block font-medium mb-1">Type</label>
                      <select name="type" value={contentForm.type} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2">
                        <option value="">Select type</option>
                        <option value="slide">Lecture Slide</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                        <option value="live">Live Session</option>
                        <option value="assignment">Assignment</option>
                        <option value="quiz">Quiz</option>
                        <option value="notice">Notice</option>
                        <option value="poll">Poll</option>
                        <option value="survey">Survey</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Title</label>
                      <input name="title" value={contentForm.title} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Description</label>
                      <textarea name="description" value={contentForm.description} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                    </div>
                    {/* Conditionally render fields based on type */}
                    {['slide','video','document'].includes(contentForm.type) && (
                      <div>
                        <label className="block font-medium mb-1">Upload File</label>
                        <input type="file" name="file" onChange={handleContentFormChange} className="w-full" />
                      </div>
                    )}
                    {contentForm.type === 'live' && (
                      <div>
                        <label className="block font-medium mb-1">Live Session Link</label>
                        <input name="contentUrl" value={contentForm.contentUrl} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                        <label className="block font-medium mb-1 mt-2">Live Date</label>
                        <input type="datetime-local" name="liveDate" value={contentForm.liveDate} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                      </div>
                    )}
                    {contentForm.type === 'assignment' && (
                      <div>
                        <label className="block font-medium mb-1">Assignment File</label>
                        <input type="file" name="file" onChange={handleContentFormChange} className="w-full" />
                        <label className="block font-medium mb-1 mt-2">Due Date</label>
                        <input type="date" name="dueDate" value={contentForm.dueDate} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                      </div>
                    )}
                    {contentForm.type === 'quiz' && (
                      <div>
                        <label className="block font-medium mb-1">Quiz Questions</label>
                        <div className="space-y-6">
                          {quizQuestions.map((q, idx) => (
                            <div key={idx} className="border rounded p-4 bg-gray-50">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold">Question {idx + 1}</span>
                                <button type="button" onClick={() => handleRemoveQuestion(idx)} className="text-red-600 text-sm">Remove</button>
                              </div>
                              <input
                                type="text"
                                className="w-full border rounded px-3 py-2 mb-2"
                                placeholder="Enter question"
                                value={q.question}
                                onChange={e => handleQuestionChange(idx, e.target.value)}
                                required
                              />
                              <div className="mb-2">
                                <span className="font-medium">Options:</span>
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2 mt-1">
                                    <input
                                      type="text"
                                      className="border rounded px-2 py-1 flex-1"
                                      placeholder={`Option ${oIdx + 1}`}
                                      value={opt}
                                      onChange={e => handleOptionChange(idx, oIdx, e.target.value)}
                                      required
                                    />
                                    <button type="button" onClick={() => handleRemoveOption(idx, oIdx)} className="text-red-500">✕</button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => handleAddOption(idx)} className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded">Add Option</button>
                              </div>
                              <div>
                                <label className="block font-medium mb-1">Correct Answer</label>
                                <select
                                  className="w-full border rounded px-3 py-2"
                                  value={q.answer}
                                  onChange={e => handleAnswerChange(idx, e.target.value)}
                                  required
                                >
                                  <option value="">Select correct answer</option>
                                  {q.options.map((opt, oIdx) => (
                                    <option key={oIdx} value={opt}>{opt || `Option ${oIdx + 1}`}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={handleAddQuestion} className="mt-4 px-4 py-2 bg-primary text-white rounded">Add Question</button>
                        <label className="block font-medium mb-1 mt-4">Due Date</label>
                        <input type="date" name="dueDate" value={contentForm.dueDate} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                      </div>
                    )}
                    {contentForm.type === 'notice' && (
                      <div>
                        <label className="block font-medium mb-1">Notice Text</label>
                        <textarea name="noticeText" value={contentForm.noticeText} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                      </div>
                    )}
                    {contentForm.type === 'poll' && (
                      <div>
                        <label className="block font-medium mb-1">Poll Options (JSON)</label>
                        <textarea name="pollOptions" value={contentForm.pollOptions} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" placeholder='[{"option":"Option 1"},{"option":"Option 2"}]' />
                      </div>
                    )}
                    {contentForm.type === 'survey' && (
                      <div>
                        <label className="block font-medium mb-1">Survey Questions (JSON)</label>
                        <textarea name="surveyQuestions" value={contentForm.surveyQuestions} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" placeholder='[{"question":"Q?","options":["A","B"],"answerRequired":true}]' />
                      </div>
                    )}
                    {contentForm.type === 'document' && (
                      <div>
                        <label className="block font-medium mb-1">External Link (optional)</label>
                        <input name="externalLink" value={contentForm.externalLink} onChange={handleContentFormChange} className="w-full border rounded px-3 py-2" />
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4">
                      <button type="button" onClick={() => setIsContentModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-primary text-white rounded" disabled={submitting}>{submitting ? 'Adding...' : 'Add Content'}</button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Quiz Results Modal */}
      <Transition appear show={quizResultsModal.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setQuizResultsModal({ open: false, quiz: null, analytics: null })}>
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
                  <Dialog.Title className="mb-4 text-xl font-bold">Quiz Results: {quizResultsModal.quiz?.title}</Dialog.Title>
                  {quizResultsModal.analytics ? (
                    quizResultsModal.analytics.error ? (
                      <div className="mb-4 font-semibold text-red-600">{quizResultsModal.analytics.error}</div>
                    ) : (
                      <div>
                        <div className="mb-4 font-semibold text-green-700">Total Submissions: {quizResultsModal.analytics.totalSubmissions}</div>
                        <div className="mb-4 font-semibold text-blue-700">Average Score: {quizResultsModal.analytics.averageScore?.toFixed(2)}</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full overflow-hidden text-xs bg-white border rounded-xl">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">Student</th>
                                <th className="px-4 py-2 border">Score</th>
                                <th className="px-4 py-2 border">Submitted At</th>
                                <th className="px-4 py-2 border">Answers</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quizResultsModal.analytics.submissions.map((s, idx) => (
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
                          <button onClick={() => setQuizResultsModal({ open: false, quiz: null, analytics: null })} className="px-4 py-2 text-white rounded bg-primary">Close</button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-gray-600">Loading...</div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Quiz View Modal */}
      <Transition appear show={quizViewModal.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setQuizViewModal({ open: false, quiz: null })}>
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
                  <Dialog.Title className="mb-4 text-xl font-bold">Quiz: {quizViewModal.quiz?.title}</Dialog.Title>
                  {quizViewModal.quiz ? (
                    <div className="space-y-6">
                      {(() => {
                        let questions = [];
                        try {
                          questions = typeof quizViewModal.quiz.questions === 'string'
                            ? JSON.parse(quizViewModal.quiz.questions)
                            : quizViewModal.quiz.questions;
                        } catch {
                          questions = [];
                        }
                        if (!questions || !questions.length) return <div className="text-gray-600">No questions found.</div>;
                        return questions.map((q, idx) => (
                          <div key={idx} className="border rounded p-4 bg-gray-50">
                            <div className="font-semibold mb-2">Q{idx + 1}: {q.question}</div>
                            <ul className="mb-2 list-disc list-inside">
                              {q.options.map((opt, oIdx) => (
                                <li key={oIdx} className={opt === q.answer ? 'text-green-700 font-semibold' : ''}>
                                  {opt} {opt === q.answer && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Correct</span>}
                                </li>
                              ))}
                            </ul>
                            <div className="text-xs text-gray-500">Correct Answer: <span className="font-semibold text-green-700">{q.answer}</span></div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-gray-600">Loading...</div>
                  )}
                  <div className="flex justify-end mt-6">
                    <button onClick={() => setQuizViewModal({ open: false, quiz: null })} className="px-4 py-2 text-white rounded bg-primary">Close</button>
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
                      <table className="min-w-full bg-white border rounded-xl overflow-hidden text-xs">
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
                                <td className="px-4 py-2 border"><a href={`/${s.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Download</a></td>
                                <td className="px-4 py-2 border">{s.comments || <span className="italic text-gray-400">None</span>}</td>
                                <td className="px-4 py-2 border">{new Date(s.submittedAt).toLocaleString()}</td>
                                <td className="px-4 py-2 border">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      className="w-16 border rounded px-2 py-1"
                                      value={grading[s._id]?.grade ?? s.grade ?? ''}
                                      onChange={e => handleGradeChange(s._id, 'grade', e.target.value)}
                                    />
                                    {isGraded && <span className="ml-1 text-green-700 font-bold">✓</span>}
                                  </div>
                                  {!isGraded && <div className="text-xs text-gray-400">Not graded</div>}
                                </td>
                                <td className="px-4 py-2 border">
                                  <input
                                    type="text"
                                    className="w-32 border rounded px-2 py-1"
                                    value={grading[s._id]?.feedback ?? s.feedback ?? ''}
                                    onChange={e => handleGradeChange(s._id, 'feedback', e.target.value)}
                                  />
                                </td>
                                <td className="px-4 py-2 border">
                                  <button
                                    onClick={() => handleGradeSubmit(s._id)}
                                    className={`px-3 py-1 bg-primary text-white rounded text-xs ${!changed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={grading[s._id]?.loading || !changed}
                                  >
                                    {grading[s._id]?.loading ? 'Saving...' : 'Save'}
                                  </button>
                                  {s.gradedBy && (
                                    <div className="text-xs text-gray-500 mt-1">
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
                    <button onClick={() => setInstructorModalOpen(false)} className="px-4 py-2 text-white rounded bg-primary">Close</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
    </>
  );
};

export default InstructorCourseDetails; 