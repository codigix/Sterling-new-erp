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
  
  // Get base URL (remove /api if present)
  const baseUrl = axios.defaults.baseURL.split('/api')[0];
  
  // Clean the path: replace backslashes and remove leading slashes
  let cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Ensure it starts with 'uploads/' if it's just a filename
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }
  
  return `${baseUrl}/${cleanPath}`;
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
