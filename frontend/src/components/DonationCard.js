const DonationCard = ({ donation, onAction }) => {
  return (
    <div className="border p-4 rounded shadow-md bg-white">
      <p><strong>Food Type:</strong> {donation.foodType}</p>
      <p><strong>Quantity:</strong> {donation.quantity}</p>
      <p><strong>Status:</strong> {donation.status}</p>
      {onAction && (
        <div className="mt-2 space-x-2">
          <button onClick={() => onAction(donation._id, "accepted")} className="bg-green-500 px-2 py-1 text-white rounded">Accept</button>
          <button onClick={() => onAction(donation._id, "declined")} className="bg-red-500 px-2 py-1 text-white rounded">Decline</button>
        </div>
      )}
    </div>
  );
};

export default DonationCard;
