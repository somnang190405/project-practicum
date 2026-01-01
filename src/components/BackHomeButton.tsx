import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackHomeButton: React.FC<{ className?: string; to?: string }>=({ className, to = '/' })=> {
  const navigate = useNavigate();
  const goHome = () => {
    try {
      navigate(to);
    } catch (e) {
      try { window.location.href = to; } catch {}
    }
  };
  return (
    <button type="button" onClick={goHome} className={className || "px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-sm inline-block"}>
      ← Back Home
    </button>
  );
};

export default BackHomeButton;
