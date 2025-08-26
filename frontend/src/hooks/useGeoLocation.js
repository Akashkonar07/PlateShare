import { useState, useEffect } from "react";

const useGeoLocation = () => {
  const [location, setLocation] = useState({ lat: null, lng: null, error: null });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null }),
      (err) => setLocation(prev => ({ ...prev, error: err.message })),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  return location;
};

export default useGeoLocation;
