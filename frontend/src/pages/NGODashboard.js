import { useState, useEffect } from "react";
import useAuth from "../hooks/useAuth";
import { fetchDonations, updateDonationStatus } from "../services/donation";
import DonationCard from "../components/DonationCard";
import MapView from "../components/MapView";

const NGODashboard = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);

  // Fetch donations every 10 seconds for live updates
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchDonations(token);
        // Filter large donations that are pending
        setDonations(data.filter(d => d.status === "pending" && d.size === "large"));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [token]);

  const handleDeliveryConfirmation = async (donationId) => {
    try {
      await updateDonationStatus(donationId, "delivered", token);
      setDonations(prev => prev.map(d => d._id === donationId ? { ...d, status: "delivered" } : d));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">NGO Dashboard</h1>
      {loading && <p>Loading donations...</p>}
      {donations.length === 0 && !loading && <p>No pending bulk donations.</p>}
      <div className="grid md:grid-cols-2 gap-4">
        {donations.map(d => (
          <DonationCard
            key={d._id}
            donation={d}
            onAction={() => handleDeliveryConfirmation(d._id)}
          />
        ))}
      </div>

      {selectedDonation && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Donation Location</h2>
          <MapView center={{ lat: selectedDonation.lat, lng: selectedDonation.lng }} markers={[selectedDonation]} />
        </div>
      )}
    </div>
  );
};

export default NGODashboard;
