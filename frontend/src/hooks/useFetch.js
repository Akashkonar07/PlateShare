import { useState, useEffect } from "react";

const useFetch = (fetchFunc, params) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchFunc(...params)
      .then(res => setData(res))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [fetchFunc, JSON.stringify(params)]);

  return { data, loading, error };
};

export default useFetch;
