// utils/dateUtils.js
export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', {
        error: error.message,
        timestamp: '2025-06-12 17:11:33',
        user: 'Kala-bot-apk'
      });
      return dateString;
    }
  };
  
  export const getRelativeTime = (dateString) => {
    if (!dateString) return '';
  
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
  
      if (diffInSeconds < 60) {
        return 'just now';
      }
  
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      }
  
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      }
  
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      }
  
      return formatDate(dateString);
    } catch (error) {
      console.error('Relative time calculation error:', {
        error: error.message,
        timestamp: '2025-06-12 17:11:33',
        user: 'Kala-bot-apk'
      });
      return dateString;
    }
  };