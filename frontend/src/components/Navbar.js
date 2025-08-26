import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Navbar = () => {
  const user = { role: "donor" }; // temp for testing


  return (
    <nav className="bg-green-600 p-4 flex justify-between text-white">
      <Link to="/" className="font-bold text-xl">PlateShare</Link>
      <div className="space-x-4">
        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
        {user && (
          <>
            {user.role === "donor" && <Link to="/donor">Dashboard</Link>}
            {user.role === "volunteer" && <Link to="/volunteer">Dashboard</Link>}
            {user.role === "ngo" && <Link to="/ngo">Dashboard</Link>}
            <button onClick={logout} className="bg-red-500 px-2 py-1 rounded">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
