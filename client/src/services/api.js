import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const healthAPI = {
  check: () => api.get('/health'),
  ready: () => api.get('/health/ready'),
  info: () => api.get('/health/info')
};

export const confirmationAPI = {
  list: (params) => api.get('/confirmations', { params }),
  getById: (id) => api.get(`/confirmations/${id}`),
  create: (data) => api.post('/confirmations', data),
  submit: (id) => api.post(`/confirmations/${id}/submit`),
  process: (id) => api.post(`/confirmations/${id}/process`),
  finish: (id) => api.post(`/confirmations/${id}/finish`),
  review: (id, data) => api.post(`/confirmations/${id}/review`, data),
  archive: (id) => api.post(`/confirmations/${id}/archive`),
  checkAuthorization: (id) => api.get(`/confirmations/${id}/authorization`),
  getLogs: (id) => api.get(`/confirmations/${id}/logs`)
};

export const authorizationAPI = {
  list: (params) => api.get('/authorizations', { params }),
  getById: (id) => api.get(`/authorizations/${id}`),
  create: (data) => api.post('/authorizations', data),
  update: (id, data) => api.put(`/authorizations/${id}`, data),
  delete: (id) => api.delete(`/authorizations/${id}`)
};

export const accountDetailAPI = {
  list: (params) => api.get('/account-details', { params }),
  getById: (id) => api.get(`/account-details/${id}`),
  create: (data) => api.post('/account-details', data),
  update: (id, data) => api.put(`/account-details/${id}`, data),
  delete: (id) => api.delete(`/account-details/${id}`)
};

export const replyOpinionAPI = {
  list: (params) => api.get('/reply-opinions', { params }),
  getById: (id) => api.get(`/reply-opinions/${id}`),
  create: (data) => api.post('/reply-opinions', data),
  update: (id, data) => api.put(`/reply-opinions/${id}`, data),
  review: (id, data) => api.post(`/reply-opinions/${id}/review`, data),
  delete: (id) => api.delete(`/reply-opinions/${id}`)
};

export const stampRecordAPI = {
  list: (params) => api.get('/stamp-records', { params }),
  getById: (id) => api.get(`/stamp-records/${id}`),
  create: (data) => api.post('/stamp-records', data),
  update: (id, data) => api.put(`/stamp-records/${id}`, data),
  delete: (id) => api.delete(`/stamp-records/${id}`),
  verifySignature: (signature) => api.get(`/stamp-records/verify/${signature}`)
};

export const masterDataAPI = {
  getClients: () => api.get('/master/clients'),
  getBanks: () => api.get('/master/banks'),
  getAccounts: (params) => api.get('/master/accounts', { params }),
  getStatusMap: () => api.get('/master/status-map')
};

export const todoTaskAPI = {
  list: (params) => api.get('/todo-tasks', { params }),
  getById: (id) => api.get(`/todo-tasks/${id}`),
  create: (data) => api.post('/todo-tasks', data),
  myTasks: (params) => api.get('/todo-tasks/my', { params }),
  getStats: () => api.get('/todo-tasks/stats'),
  secondConfirm: (id, data) => api.post(`/todo-tasks/${id}/second-confirm`, data),
  delete: (id) => api.delete(`/todo-tasks/${id}`)
};

export default api;
