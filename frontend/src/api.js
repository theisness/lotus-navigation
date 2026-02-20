const TOKEN_KEY = 'nav_portal_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 非 FormData 请求自动设置 Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.error || '请求失败');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// 认证相关 API
export const authApi = {
  sendCode(email) {
    return request('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  register(email, password, code) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, code }),
    });
  },

  login(email, password) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe() {
    return request('/api/auth/me');
  },

  updateProfile(data) {
    return request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// 导航项相关 API
export const navApi = {
  getNavItems() {
    return request('/api/nav-items');
  },

  createNavItem(data) {
    return request('/api/nav-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteNavItem(id) {
    return request(`/api/nav-items/${id}`, {
      method: 'DELETE',
    });
  },

  updateNavItem(id, data) {
    return request(`/api/nav-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  reorderNavItems(orders) {
    return request('/api/nav-items/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orders }),
    });
  },
};

// 图片上传 API
export const uploadApi = {
  uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return request('/api/upload/image', {
      method: 'POST',
      body: formData,
    });
  },
};

// 管理员 API（需登录且为管理员）
export const adminApi = {
  getMembers() {
    return request('/api/admin/members');
  },
  getMemberById(id) {
    return request(`/api/admin/members/${id}`);
  },
  updateMember(id, data) {
    return request(`/api/admin/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteMember(id) {
    return request(`/api/admin/members/${id}`, { method: 'DELETE' });
  },
  getGroups() {
    return request('/api/admin/groups');
  },
  createGroup(name) {
    return request('/api/admin/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  updateGroup(id, name) {
    return request(`/api/admin/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },
  deleteGroup(id) {
    return request(`/api/admin/groups/${id}`, { method: 'DELETE' });
  },
  getUserGroups(userId) {
    return request(`/api/admin/users/${userId}/groups`);
  },
  setUserGroups(userId, groupIds) {
    return request(`/api/admin/users/${userId}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groupIds }),
    });
  },
};

// 站点设置 API
export const settingsApi = {
  getTheme() {
    return request('/api/settings/theme');
  },
  setTheme(theme) {
    return request('/api/settings/theme', {
      method: 'PUT',
      body: JSON.stringify({ theme }),
    });
  },
};

export { getToken, setToken, removeToken };
