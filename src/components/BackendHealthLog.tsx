'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function BackendHealthLog() {
  useEffect(() => {
    const healthUrl = `${API_URL.replace(/\/$/, '')}/health`;

    fetch(healthUrl)
      .then((res) => res.json())
      .then((data) => {
        console.log('%c[AutoFollow] Connected backend', 'color:#22c55e;font-weight:bold');
        console.log('  API URL:', API_URL);
        console.log('  Backend:', data.backend);
        console.log('  Environment:', data.nodeEnv);
        console.log('  Health:', data);
      })
      .catch((err) => {
        console.warn('[AutoFollow] Backend health check failed');
        console.warn('  API URL:', API_URL);
        console.warn('  Error:', err);
      });
  }, []);

  return null;
}
