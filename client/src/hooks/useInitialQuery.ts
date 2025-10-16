import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook to read and apply initial query from URL parameters or localStorage
 * Used for pre-filling chat input when user is redirected from SPA
 *
 * @param setText - Function to set the text in the chat input
 *
 * @example
 * // URL: https://chat.severalxconsulting.com?q=How%20much%20does%20AI%20cost
 * const [text, setText] = useState('');
 * useInitialQuery(setText);
 * // text will be set to "How much does AI cost"
 */
export const useInitialQuery = (setText: (text: string) => void) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const readCookie = (name: string) => {
    const cookies = document.cookie?.split(';') ?? [];
    for (const cookie of cookies) {
      const [key, ...rest] = cookie.trim().split('=');
      if (key === name) {
        return decodeURIComponent(rest.join('='));
      }
    }
    return null;
  };

  const clearCookie = (name: string) => {
    const domain = window.location.hostname;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}; SameSite=Lax`;
  };

  useEffect(() => {
    // Check URL parameter for query
    const query = searchParams.get('q');

    // Check localStorage for pending query (after login redirect)
    const pendingQuery = localStorage.getItem('pending_chat_query');
    const cookieQuery = readCookie('pending_chat_query');

    if (query) {
      // Set text from URL parameter
      setText(query);

      // Clean up: remove query parameter from URL without page reload
      searchParams.delete('q');
      setSearchParams(searchParams, { replace: true });

      // Also check for autoSend parameter
      const autoSend = searchParams.get('autoSend');
      if (autoSend === 'true') {
        // Store flag for component to handle auto-send
        sessionStorage.setItem('autoSendQuery', 'true');
        searchParams.delete('autoSend');
        setSearchParams(searchParams, { replace: true });
      }
    } else if (pendingQuery || cookieQuery) {
      const queryFromStorage = pendingQuery ?? cookieQuery ?? '';
      if (queryFromStorage) {
        setText(queryFromStorage);
      }
      localStorage.removeItem('pending_chat_query');
      clearCookie('pending_chat_query');
    }
  }, [searchParams, setSearchParams, setText]);
};

export default useInitialQuery;
