import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupUser, loginUser } from "../services/auth";
import { useAuth } from "../hooks/useAuth"; // make sure useAuth is exported correctly

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor", // default role
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth(); // get setUser from AuthContext

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // 1️⃣ Signup request
      await signupUser(formData); // hits http://localhost:5000/api/register

      // 2️⃣ Login immediately after signup
      const response = await loginUser({
        email: formData.email,
        password: formData.password,
      });

      // 3️⃣ Save token and update context
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);

      // 4️⃣ Navigate to role-based dashboard
      if (response.data.user.role === "donor") navigate("/donor");
      else if (response.data.user.role === "volunteer") navigate("/volunteer");
      else if (response.data.user.role === "ngo") navigate("/ngo");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Signup</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
          autoComplete="name"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
          autoComplete="email"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
          autoComplete="new-password"
        />
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="donor">Donor</option>
          <option value="volunteer">Volunteer</option>
          <option value="ngo">NGO</option>
        </select>
        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Signup
        </button>
      </form>
    </div>
  );
};

export default Signup;
