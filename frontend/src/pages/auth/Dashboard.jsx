import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.error}>Not authenticated. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Dashboard</h1>

        <div style={styles.userInfo}>
          <h2 style={styles.welcomeText}>Welcome, {user.username}!</h2>

          <div style={styles.infoBox}>
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Member Since:</strong>{" "}
              {new Date(user.created_at).toLocaleDateString()}
            </p>
            <p>
              <strong>User ID:</strong> {user.id}
            </p>
          </div>

          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div style={styles.nextSteps}>
          <h3 style={styles.subtitle}>Next Steps:</h3>
          <ul>
            <li>Upload dog images for scanning</li>
            <li>View scan history</li>
            <li>Update profile settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "500px",
  },
  title: {
    marginBottom: "30px",
    textAlign: "center",
    color: "#333",
    fontSize: "28px",
    fontWeight: "bold",
  },
  userInfo: {
    marginBottom: "30px",
  },
  welcomeText: {
    color: "#28a745",
    fontSize: "20px",
    marginBottom: "20px",
  },
  logoutButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
  },
  nextSteps: {
    backgroundColor: "#e7f3ff",
    padding: "20px",
    borderRadius: "4px",
    border: "1px solid #bee5eb",
  },
  subtitle: {
    marginTop: 0,
    color: "#0056b3",
    fontSize: "16px",
  },
};

export default Dashboard;
