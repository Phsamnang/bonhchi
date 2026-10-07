import { useEffect, useState } from "react";

/** `value`, but only after it has stopped changing for `delay` ms (for search-as-you-type) */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Page number + debounced search text for a server-paginated list.
 * The page resets to 1 whenever the search or any value in `resetOn` changes.
 */
export function usePagedSearch(resetOn: unknown[] = [], delay = 300) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim(), delay);
  const [page, setPage] = useState(1);

  // Adjust state during render when the inputs change (no extra effect pass)
  const key = JSON.stringify([debouncedSearch, ...resetOn]);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  return { search, setSearch, debouncedSearch, page, setPage };
}
