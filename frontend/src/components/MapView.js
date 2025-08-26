import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '400px' };

const MapView = ({ center, markers = [] }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  });

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15}>
      {markers.map((m, i) => <Marker key={i} position={{ lat: m.lat, lng: m.lng }} />)}
    </GoogleMap>
  );
};

export default MapView;
