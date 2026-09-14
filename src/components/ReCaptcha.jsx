import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * Google reCAPTCHA v2 ("I'm not a robot" Checkbox) Component
 * 
 * Uses Google's official testing key by default for localhost development:
 * Site Key: 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
 * 
 * Can be overridden via VITE_RECAPTCHA_SITE_KEY environment variable.
 */
const DEFAULT_SITE_KEY = '6Lf197otAAAAAKWaNv2gSG5G2pJBQeHa0Vh8v5IB';

const ReCaptcha = forwardRef(({ onChange, onExpired, className = '' }, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || DEFAULT_SITE_KEY;

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.grecaptcha && widgetIdRef.current !== null) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (e) {
          console.warn('reCAPTCHA reset warning:', e);
        }
      }
      if (onChange) onChange(null);
    }
  }));

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || widgetIdRef.current !== null) return;
      if (window.grecaptcha && window.grecaptcha.render) {
        try {
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => {
              if (onChange) onChange(token);
            },
            'expired-callback': () => {
              if (onExpired) onExpired();
              if (onChange) onChange(null);
            },
            theme: 'light'
          });
        } catch (err) {
          // If already rendered in this container, ignore
          console.warn('reCAPTCHA render notice:', err.message);
        }
      }
    };

    // Load Google script if not already on page
    if (!window.grecaptcha) {
      const scriptId = 'google-recaptcha-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(renderWidget);
          }
        };
        document.head.appendChild(script);
      } else {
        const existingScript = document.getElementById(scriptId);
        existingScript.addEventListener('load', () => {
          if (window.grecaptcha) window.grecaptcha.ready(renderWidget);
        });
      }
    } else {
      window.grecaptcha.ready(renderWidget);
    }

    return () => {
      isMounted = false;
    };
  }, [siteKey, onChange, onExpired]);

  return (
    <div className={`flex justify-center my-3 ${className}`}>
      <div ref={containerRef} className="recaptcha-container transform scale-95 origin-center sm:scale-100" />
    </div>
  );
});

export default ReCaptcha;
