import React, { useState, useEffect } from 'react';

const categories = ['Programming', 'Design', 'Business', 'Language', 'Other'];
const levels = ['Beginner', 'Intermediate', 'Advanced'];

const EditCourseModal = ({ open, onClose, course, onSave }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    level: '',
    coverImage: null,
    sampleVideo: null,
  });
  const [coverPreview, setCoverPreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        price: course.price || '',
        level: course.level || '',
        coverImage: null,
        sampleVideo: null,
      });
      setCoverPreview(course.coverImage || '');
      setVideoPreview(course.sampleVideo || '');
    }
  }, [course]);

  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setForm({ ...form, [name]: files[0] });
      if (name === 'coverImage') setCoverPreview(URL.createObjectURL(files[0]));
      if (name === 'sampleVideo') setVideoPreview(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-2xl">&times;</button>
        <h2 className="text-2xl font-bold text-center text-primary mb-6">Edit Course</h2>
        <form onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Course Title"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Course Description"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            rows={4}
            required
          />
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            required
          >
            <option value="">Select Category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="Price (USD)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            min={0}
            required
          />
          <select
            name="level"
            value={form.level}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            required
          >
            <option value="">Select Level</option>
            {levels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
          <div>
            <label className="block mb-2 font-medium text-gray-700">Cover Image (JPG, PNG)</label>
            <input
              type="file"
              name="coverImage"
              accept="image/*"
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            />
            {coverPreview && <img src={coverPreview} alt="Cover Preview" className="mt-2 w-full h-32 object-cover rounded-md" />}
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700">Sample Video (MP4, WebM)</label>
            <input
              type="file"
              name="sampleVideo"
              accept="video/mp4,video/webm"
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            />
            {videoPreview && <video src={videoPreview} controls className="mt-2 w-full h-32 object-cover rounded-md" />}
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white font-bold py-3 rounded-lg shadow-md hover:bg-secondary transition text-lg"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditCourseModal; 