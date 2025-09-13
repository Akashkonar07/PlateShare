import { useState, useEffect } from 'react';

export const useLoadingStates = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const startLoading = (message = 'Loading...') => {
    setIsLoading(true);
    setLoadingMessage(message);
    setLoadingProgress(0);
  };

  const updateProgress = (progress) => {
    setLoadingProgress(Math.min(100, Math.max(0, progress)));
  };

  const stopLoading = () => {
    setIsLoading(false);
    setLoadingProgress(100);
    setTimeout(() => {
      setLoadingProgress(0);
      setLoadingMessage('');
    }, 500);
  };

  const simulateLoading = (duration = 2000, message = 'Loading...') => {
    startLoading(message);
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          stopLoading();
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, duration / 20);
  };

  return {
    isLoading,
    loadingProgress,
    loadingMessage,
    startLoading,
    updateProgress,
    stopLoading,
    simulateLoading
  };
};

export const useMicroInteractions = () => {
  const [hoverStates, setHoverStates] = useState({});
  const [clickStates, setClickStates] = useState({});

  const setHover = (elementId, isHovered) => {
    setHoverStates(prev => ({
      ...prev,
      [elementId]: isHovered
    }));
  };

  const setClick = (elementId, isClicked) => {
    setClickStates(prev => ({
      ...prev,
      [elementId]: isClicked
    }));
    if (isClicked) {
      setTimeout(() => {
        setClickStates(prev => ({
          ...prev,
          [elementId]: false
        }));
      }, 200);
    }
  };

  const addRippleEffect = (event, elementId) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  return {
    hoverStates,
    clickStates,
    setHover,
    setClick,
    addRippleEffect
  };
};

export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('forward');

  const startTransition = (direction = 'forward') => {
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  return {
    isTransitioning,
    transitionDirection,
    startTransition
  };
};
