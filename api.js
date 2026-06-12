// api.js — Frontend ↔ Backend Bridge
// Include this file in ALL your HTML pages:
// <script src="api.js"></script>

// ============================================================
// CHANGE THIS TO YOUR BACKEND URL WHEN DEPLOYED
// ============================================================
const API_URL = 'https://imaksa-backend-production.up.railway.app/api';
// When live: const API_URL = 'https://your-backend.railway.app/api';

// ── Get JWT token from localStorage ──
const getToken = () => localStorage.getItem('imaksa_token');

// ── Universal API caller ──
const apiCall = async (endpoint, method = 'GET', body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Network error. Please check your connection.' };
  }
};

// ============================================================
// PUBLIC APIs (no login needed)
// ============================================================

// Get all properties (for properties.html)
const getProperties = async (type = '') => {
  const query = type ? `?type=${type}` : '';
  return await apiCall(`/properties${query}`);
};

// Get featured properties (for homepage)
const getFeaturedProperties = async () => {
  return await apiCall('/properties?featured=true&limit=4');
};

// Get all blogs (for blog.html)
const getBlogs = async () => {
  return await apiCall('/blogs');
};

// Get team members (for about.html)
const getTeam = async () => {
  return await apiCall('/team');
};

// Submit contact form
const submitEnquiry = async (formData) => {
  return await apiCall('/enquiries', 'POST', formData);
};

// ============================================================
// ADMIN APIs (login required)
// ============================================================

// Login
const adminLogin = async (username, password) => {
  const res = await apiCall('/auth/login', 'POST', { username, password });
  if (res.success && res.token) {
    localStorage.setItem('imaksa_token', res.token);
    localStorage.setItem('imaksa_admin', JSON.stringify(res.admin));
  }
  return res;
};

// Logout
const adminLogout = () => {
  localStorage.removeItem('imaksa_token');
  localStorage.removeItem('imaksa_admin');
};

// Check if logged in
const isLoggedIn = () => !!getToken();

// ── PROPERTIES (Admin) ──
const addProperty    = (data) => apiCall('/properties', 'POST', data, true);
const updateProperty = (id, data) => apiCall(`/properties/${id}`, 'PUT', data, true);
const deleteProperty = (id) => apiCall(`/properties/${id}`, 'DELETE', null, true);
const getAllProperties = () => apiCall('/properties', 'GET', null, true);

// ── BLOGS (Admin) ──
const addBlog    = (data) => apiCall('/blogs', 'POST', data, true);
const updateBlog = (id, data) => apiCall(`/blogs/${id}`, 'PUT', data, true);
const deleteBlog = (id) => apiCall(`/blogs/${id}`, 'DELETE', null, true);

// ── TEAM (Admin) ──
const addTeamMember    = (data) => apiCall('/team', 'POST', data, true);
const updateTeamMember = (id, data) => apiCall(`/team/${id}`, 'PUT', data, true);
const deleteTeamMember = (id) => apiCall(`/team/${id}`, 'DELETE', null, true);

// ── ENQUIRIES (Admin) ──
const getEnquiries  = () => apiCall('/enquiries', 'GET', null, true);
const markEnqRead   = (id) => apiCall(`/enquiries/${id}/read`, 'PUT', null, true);
const markAllRead   = () => apiCall('/enquiries/read-all', 'PUT', null, true);
const deleteEnquiry = (id) => apiCall(`/enquiries/${id}`, 'DELETE', null, true);

// ── PASSWORD ──
const changePassword = (currentPassword, newPassword) =>
  apiCall('/auth/change-password', 'PUT', { currentPassword, newPassword }, true);

// ============================================================
// HELPER: Load properties into any page
// ============================================================
const loadPropertiesIntoPage = async (containerId, type = '') => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:#6B6B60;">Loading properties...</div>';

  const res = await getProperties(type);
  if (!res.success || !res.data.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#6B6B60;">No properties found.</div>';
    return;
  }

  container.innerHTML = res.data.map(p => `
    <div class="pc${p.featured ? ' pc-feat' : ''}" data-type="${p.type}">
      <img src="${p.img || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=700&q=80'}" 
           alt="${p.name}" loading="lazy"
           onerror="this.src='https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=700&q=80'">
      <div class="pc-grad"></div>
      ${p.badge ? `<div class="pc-badge">${p.badge}</div>` : ''}
      <div class="pc-body">
        <div class="pc-price">AED ${p.price}</div>
        <div class="pc-name">${p.name}</div>
        <div class="pc-loc">${p.location}</div>
        <div class="pc-specs">
          ${p.beds ? `<div class="pcs"><strong>${p.beds}</strong>Beds</div>` : ''}
          ${p.baths ? `<div class="pcs"><strong>${p.baths}</strong>Baths</div>` : ''}
          ${p.area ? `<div class="pcs"><strong>${p.area}</strong>Sq.Ft</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
};

// ============================================================
// HELPER: Connect contact form to backend
// ============================================================
const connectContactForm = (formId, btnId, successMsg = 'Thank you! We\'ll be in touch within 24 hours.') => {
  const form = document.getElementById(formId);
  const btn  = document.getElementById(btnId);
  if (!form || !btn) return;

  btn.addEventListener('click', async () => {
    const data = {
      name:     form.querySelector('[data-field="name"]')?.value?.trim(),
      email:    form.querySelector('[data-field="email"]')?.value?.trim(),
      phone:    form.querySelector('[data-field="phone"]')?.value?.trim(),
      interest: form.querySelector('[data-field="interest"]')?.value,
      budget:   form.querySelector('[data-field="budget"]')?.value,
      message:  form.querySelector('[data-field="message"]')?.value?.trim(),
    };

    if (!data.name || !data.email) {
      alert('Please fill in your name and email.');
      return;
    }

    btn.textContent = 'Sending...';
    btn.disabled = true;

    const res = await submitEnquiry(data);

    if (res.success) {
      btn.textContent = '✅ Sent!';
      btn.style.background = '#0D9B6E';
      form.querySelectorAll('input, textarea, select').forEach(el => el.value = '');
      setTimeout(() => {
        btn.textContent = 'Submit Enquiry';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    } else {
      btn.textContent = 'Try Again';
      btn.disabled = false;
      alert(res.message || 'Something went wrong. Please try again.');
    }
  });
};

console.log('✅ IMAKSA API loaded — Backend URL:', API_URL);
