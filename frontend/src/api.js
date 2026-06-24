const BASE = "http://127.0.0.1:8000";

export const getToken = () => localStorage.getItem("studydb_token");
export const setToken = (token) => localStorage.setItem("studydb_token", token);
export const clearToken = () => localStorage.removeItem("studydb_token");

const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${BASE}${url}`, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    clearToken();
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

export const loginUser = (email, password, role) =>
  fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role }),
  }).then((r) => {
    if (!r.ok) throw new Error("Invalid credentials");
    return r.json();
  }).then((data) => {
    setToken(data.token);
    return data;
  });

export const getTeacherStudents = (teacherId) => apiFetch(`/teachers/${teacherId}/students`);
export const getTeacherClasses = (teacherId) => apiFetch(`/teachers/${teacherId}/classes`);
export const getStudentAttempts = (studentId) => apiFetch(`/students/${studentId}/attempts`);
export const getTopicScores = (studentId, attemptId) => apiFetch(`/students/${studentId}/attempts/${attemptId}/topic-scores`);
export const getBehavioral = (studentId, attemptId) => apiFetch(`/students/${studentId}/attempts/${attemptId}/behavioral`);
export const getStudentClasses = (studentId) => apiFetch(`/students/${studentId}/classes`);
export const getClassQuizzes = (classId) => apiFetch(`/classes/${classId}/quizzes`);
export const getClassTopics = (classId) => apiFetch(`/classes/${classId}/topics`);
export const createQuiz = (payload) => apiFetch(`/quizzes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const getQuizReport = (classId, quizId) => apiFetch(`/classes/${classId}/quizzes/${quizId}/report`);
export const getClassQuizStats = (classId, quizId) => apiFetch(`/classes/${classId}/quizzes/${quizId}/class-stats`);
export const getClassStudentTopicScores = (classId, studentId) => apiFetch(`/classes/${classId}/students/${studentId}/topic-scores`);
export const getQuizQuestions = (quizId) => apiFetch(`/quizzes/${quizId}/questions`);
export const postQuizToClass = (quizId, classId) => apiFetch(`/quizzes/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quiz_id: quizId, class_id: classId }) });
export const submitAttempt = (payload) => apiFetch(`/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
