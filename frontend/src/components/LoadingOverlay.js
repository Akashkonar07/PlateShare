import React from 'react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ isLoading, loadingProgress, loadingMessage }) => {
  if (!isLoading) return null;

  return (
    <div className={`loading-overlay ${isLoading ? 'active' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-message">{loadingMessage}</div>
        <div className="loading-progress">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
