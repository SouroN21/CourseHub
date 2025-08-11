import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminCreate from './components/AdminCreate';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import Profile from './pages/Profile';
import InstructorProfile from './pages/InstructorProfile';
import CreateCourse from './pages/CreateCourse';
import AdminDashboard from './pages/AdminDashboard';
import PurchaseSuccess from './components/PurchaseSuccess';
import Footer from './components/Footer';
import InstructorCourseDetails from './pages/InstructorCourseDetails';
import CourseContents from './pages/CourseContents';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="mt-10">
         <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/create" element={<AdminCreate />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/instructor/profile" element={<InstructorProfile />} />
          <Route path="/instructor/create-course" element={<CreateCourse />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/purchase-success" element={<PurchaseSuccess />} />
          <Route path="/instructor/course/:courseId" element={<InstructorCourseDetails />} />
          <Route path="/course-contents/:courseId" element={<CourseContents />} />
          <Route path="/" element={<Home />} />
        </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;