/**
 * axios setup to use mock service
 */

import axios from "axios";

const axiosServices = axios.create();

// Add interceptor to inject JWT token
// axiosServices.interceptors.request.use(config => {
//   const token = localStorage.getItem('jwt');

//   // Skip token if `config.skipAuth` is set or the URL is in a whitelist
//   const skipAuth = config.skipAuth || ['login', 'forgot-password', 'register', 'verify-otp'].some(url =>
//     config.url?.includes(url)
//   );

//   if (!skipAuth && token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

// interceptor for http
axiosServices.interceptors.response.use(
  (response) => response,
  (error) =>
    Promise.reject((error.response && error.response.data) || "Wrong Services")
);

export default axiosServices;
