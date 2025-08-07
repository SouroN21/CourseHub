import React, { useState } from 'react';
import API_CONFIG from '../config/apiConfig';

const CreateCourse = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    level: '',
    isFree: false,
    coverImage: null,
    sampleVideo: null,
  });
  const [coverPreview, setCoverPreview] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = e => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: checked, price: checked ? 0 : '' });
    } else if (type === 'file') {
      setForm({ ...form, [name]: files[0] });
      if (name === 'coverImage') setCoverPreview(URL.createObjectURL(files[0]));
      if (name === 'sampleVideo') setVideoPreview(URL.createObjectURL(files[0]));
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) formData.append(key, value);
      });
      const res = await fetch(`${API_CONFIG.BASE_URL}/courses/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to create course');
      setMessage('Course created successfully!');
      setForm({ title: '', description: '', category: '', price: '', level: '', isFree: false, coverImage: null, sampleVideo: null });
      setCoverPreview('');
      setVideoPreview('');
    } catch (err) {
      setError('Failed to create course.');
    }
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-extrabold text-primary mb-6 text-center">Create a New Course</h1>
        <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
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
            <option value="Programming">Programming</option>
            <option value="Design">Design</option>
            <option value="Business">Business</option>
            <option value="Language">Language</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isFree"
              checked={form.isFree}
              onChange={handleChange}
              id="isFree"
              className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="isFree" className="text-gray-700 font-medium">This is a free course</label>
          </div>
          <input
            type="number"
            name="price"
            value={form.isFree ? 0 : form.price}
            onChange={handleChange}
            placeholder="Price (USD)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            min={0}
            required={!form.isFree}
            disabled={form.isFree}
          />
          <select
            name="level"
            value={form.level}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:outline-none text-lg"
            required
          >
            <option value="">Select Level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
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
            Create Course
          </button>
        </form>
        {message && <p className="text-green-600 mt-4 text-center">{message}</p>}
        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default CreateCourse;