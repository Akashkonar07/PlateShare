import { useEffect, useRef } from 'react';

export const useScrollAnimations = () => {
  const observerRef = useRef(null);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof document === 'undefined') {
      return;
    }
    
    // Wait for DOM to be ready
    const initializeObserver = () => {
      // Initialize Intersection Observer for scroll animations
      const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: [0.1, 0.25, 0.5, 0.75]
      };

      const handleIntersect = (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Add staggered animation for multiple elements
            const parent = entry.target.parentElement;
            if (parent) {
              const siblings = parent.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale');
              siblings.forEach((sibling, index) => {
                if (sibling !== entry.target) {
                  setTimeout(() => {
                    sibling.classList.add('visible');
                  }, index * 100);
                }
              });
            }
          }
        });
      };

      observerRef.current = new IntersectionObserver(handleIntersect, observerOptions);

      // Observe all scroll animation elements
      const scrollElements = document.querySelectorAll(
        '.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale'
      );
      
      scrollElements.forEach(el => {
        observerRef.current.observe(el);
      });
    };

    // Initialize observer after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeObserver, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
};

export const useParallaxEffects = () => {
  const parallaxRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax-slow, .parallax-medium, .parallax-fast');
      
      parallaxElements.forEach(element => {
        const speed = element.classList.contains('parallax-slow') ? 0.5 : 
                     element.classList.contains('parallax-medium') ? 0.3 : 0.1;
        
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });

      // Hero parallax effects
      const heroParallaxBg = document.querySelector('.hero-parallax-bg');
      if (heroParallaxBg) {
        const yPos = -(scrolled * 0.4);
        heroParallaxBg.style.transform = `translateY(${yPos}px)`;
      }

      // Floating elements
      const floatingElements = document.querySelectorAll('.hero-parallax-float');
      floatingElements.forEach((element, index) => {
        const speed = 0.1 + (index * 0.05);
        const yPos = -(scrolled * speed);
        const xPos = Math.sin(scrolled * 0.001 + index) * 20;
        element.style.transform = `translateY(${yPos}px) translateX(${xPos}px)`;
      });

      // Section parallax
      const sectionParallax = document.querySelectorAll('.section-parallax::before');
      sectionParallax.forEach(element => {
        const yPos = -(scrolled * 0.2);
        element.style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};

export const useSmoothScroll = () => {
  useEffect(() => {
    // Smooth scroll behavior for anchor links
    const handleAnchorClick = (e) => {
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };

    // Add click event listeners to all anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
      link.addEventListener('click', handleAnchorClick);
    });

    return () => {
      anchorLinks.forEach(link => {
        link.removeEventListener('click', handleAnchorClick);
      });
    };
  }, []);
};
