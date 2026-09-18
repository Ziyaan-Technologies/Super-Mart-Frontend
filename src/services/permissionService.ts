import axios from 'axios';

export async function fetchPermissions() {
  const response = await axios.get(`auth/me/permissions`);
  return response.data;
}
