import { useRef, useEffect } from "react";

const PhotoCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Cleanup function to stop all media streams
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
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
      stopCamera(); // Stop any existing streams
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use the back camera by default
        } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access the camera. Please check permissions and try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const video = videoRef.current;
      if (!video.videoWidth) {
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
          onCapture(file);
          stopCamera();
        },
        'image/jpeg',
        0.9 // Quality
      );
    } catch (error) {
      console.error("Error taking photo:", error);
      alert("Failed to capture image. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 w-full max-w-md">
        <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex justify-center space-x-4 mt-4">
          <button 
            onClick={takePhoto}
            className="w-16 h-16 rounded-full bg-red-500 border-4 border-white shadow-lg"
            aria-label="Take photo"
          ></button>
        </div>
        
        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={startCamera}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
          >
            Retake
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;
