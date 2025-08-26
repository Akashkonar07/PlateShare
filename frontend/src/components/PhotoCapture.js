import { useRef } from "react";

const PhotoCapture = ({ onCapture }) => {
  const videoRef = useRef(null);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const takePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob(onCapture, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <video ref={videoRef} autoPlay className="w-80 h-60 border" />
      <div>
        <button onClick={startCamera} className="bg-blue-500 px-4 py-2 text-white rounded mr-2">Start Camera</button>
        <button onClick={takePhoto} className="bg-green-500 px-4 py-2 text-white rounded">Capture</button>
      </div>
    </div>
  );
};

export default PhotoCapture;
