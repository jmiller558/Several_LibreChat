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

  useEffect(() => {
    // Check URL parameter for query
    const query = searchParams.get('q');

    // Check localStorage for pending query (after login redirect)
    const pendingQuery = localStorage.getItem('pending_chat_query');

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
    } else if (pendingQuery) {
      // Set text from localStorage (after login)
      setText(pendingQuery);

      // Clean up: remove from localStorage
      localStorage.removeItem('pending_chat_query');
    }
  }, [searchParams, setSearchParams, setText]);
};

export default useInitialQuery;
