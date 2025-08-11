const API_CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
};

export default API_CONFIG;

// Mark course content as complete for a student
export async function markContentComplete(courseId, contentId, token) {
  const res = await fetch(`${API_CONFIG.BASE_URL}/enrollments/${courseId}/complete/${contentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update progress');
  }
  return res.json();
}