import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DonorDashboard from "./pages/DonorDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import NGODashboard from "./pages/NGODashboard";
import { useAuth } from "./hooks/useAuth";


// Private route component
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role.toLowerCase())) {
    console.log("Access denied. User role:", user.role, "Required roles:", roles);
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/donor"
          element={
            <PrivateRoute roles={["donor"]}>
              <DonorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/volunteer"
          element={
            <PrivateRoute roles={["volunteer"]}>
              <VolunteerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/ngo"
          element={
            <PrivateRoute roles={["ngo"]}>
              <NGODashboard />
            </PrivateRoute>
          }
        />
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
