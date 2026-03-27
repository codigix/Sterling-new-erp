import axios from './api';

/**
 * Resolves a file path to a full server URL.
 * Handles both relative paths (filenames) and legacy paths starting with 'uploads/'.
 * 
 * @param {string} filePath - The path or filename stored in the database
 * @returns {string} The full URL to the file
 */
export const getServerUrl = (filePath) => {
  if (!filePath) return "";
  
  // axios.defaults.baseURL is usually "http://localhost:5001/api/"
  // We want to serve from "http://localhost:5001/uploads/"
  const baseUrl = axios.defaults.baseURL.split('/api')[0];
  
  // Clean the path: replace backslashes and remove leading slashes
  let cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // If the path already starts with 'uploads/', remove it so we can prepend it consistently
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.substring(8);
  }
  
  // Return baseUrl + /uploads/ + filename
  return `${baseUrl}/uploads/${cleanPath}`;
};

/**
 * Triggers a file download from the server.
 * 
 * @param {string} filePath - The path or filename stored in the database
 * @param {string} displayName - The name to save the file as
 */
export const downloadFile = async (filePath, displayName) => {
  try {
    const fileUrl = getServerUrl(filePath);
    const response = await axios.get(fileUrl, {
      responseType: 'blob',
      baseURL: '' // Prevent doubling the /api/ prefix if fileUrl is already absolute
    });
    
    const extension = filePath.split('.').pop();
    const fileName = (displayName && displayName.toLowerCase().endsWith(`.${extension.toLowerCase()}`))
      ? displayName 
      : `${displayName || 'download'}.${extension}`;

    const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
};
