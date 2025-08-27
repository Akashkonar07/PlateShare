import { useAuth } from "../hooks/useAuth";

const NGODashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto mt-20 p-4 bg-white shadow rounded">
      <h2 className="text-3xl font-bold mb-4">NGO Dashboard</h2>
      {user ? (
        <div>
          <p>Welcome, {user.name || "NGO"}!</p>
          <p>Your role: {user.role}</p>
          <button
            onClick={logout}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      ) : (
        <p>Please login to access your dashboard.</p>
      )}
    </div>
  );
};

export default NGODashboard;
