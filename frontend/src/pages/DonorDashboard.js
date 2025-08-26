import { useState } from "react";
import useAuth from "../hooks/useAuth";
import PhotoCapture from "../components/PhotoCapture";
import { createDonation, fetchDonations } from "../services/donation";
import useFetch from "../hooks/useFetch";
import DonationCard from "../components/DonationCard";

const DonorDashboard = () => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const { data: donations, loading, error } = useFetch(fetchDonations, [token]);
  const [photoFile, setPhotoFile] = useState(null);

  const handleDonationSubmit = async () => {
    if (!photoFile) return alert("Capture a photo first!");
    const formData = new FormData();
    formData.append("photo", photoFile);
    formData.append("foodType", "Meals");
    formData.append("quantity", 5);
    try { await createDonation(formData, token); alert("Donation submitted"); } 
    catch (err) { console.error(err); }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Donor Dashboard</h1>
      <PhotoCapture onCapture={file => setPhotoFile(file)} />
      <button onClick={handleDonationSubmit} className="bg-blue-500 text-white px-4 py-2 mt-2 rounded">Submit Donation</button>

      <h2 className="mt-8 text-xl font-semibold">My Donations</h2>
      {loading && <p>Loading...</p>}
      {error && <p>Error loading donations</p>}
      {donations && donations.map(d => <DonationCard key={d._id} donation={d} />)}
    </div>
  );
};

export default DonorDashboard;
