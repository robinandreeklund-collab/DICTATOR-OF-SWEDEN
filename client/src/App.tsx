import { useEffect } from 'react';
import { ValfeberApp } from './valfeber/ValfeberApp.js';

export function App() {
  useEffect(() => {
    document.title = 'Valfeber 2026';
  }, []);
  return <ValfeberApp />;
}
