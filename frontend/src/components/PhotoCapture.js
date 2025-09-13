import { useRef, useEffect, useState } from "react";

const PhotoCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState(null);

  // Cleanup function to stop all media streams
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      stopCamera(); // Stop any existing streams
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use the back camera by default
        } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access the camera. Please check permissions and try again.");
      setIsCameraReady(false);
    }
  };

  const takePhoto = async () => {
    try {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error('Camera not ready');
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob and pass to parent
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error('Failed to capture image');
          }
          // Convert blob to file with a proper filename
          const file = new File([blob], `donation-${Date.now()}.jpg`, { 
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          // Call onCapture with the file - this should NOT submit the form
          onCapture(file);
          
          // Stop camera after successful capture
          stopCamera();
        },
        'image/jpeg',
        0.9 // Quality
      );
    } catch (error) {
      console.error("Error taking photo:", error);
      setError("Failed to capture image. Please try again.");
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  return (
    <div className="photo-capture-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">📸 Capture Food Photo</h3>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="close-btn"
            aria-label="Close camera"
          >
            ×
          </button>
        </div>
        
        <div className="video-container">
          {error ? (
            <div className="error-message" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#ef4444',
              textAlign: 'center',
              padding: '20px'
            }}>
              <div>
                <div style={{fontSize: '48px', marginBottom: '10px'}}>📷</div>
                <div>{error}</div>
              </div>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              muted
              className="camera-video"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '8px'
              }}
            />
          )}
        </div>
        
        <div className="camera-controls">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              takePhoto();
            }}
            disabled={!isCameraReady || !!error}
            className="capture-btn"
            aria-label="Take photo"
            title={isCameraReady ? "Take photo" : "Camera not ready"}
          />
        </div>
        
        <div className="action-buttons">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="action-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRetake();
            }}
            disabled={!isCameraReady || !!error}
            className="action-btn primary"
          >
            🔄 Retake
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;
