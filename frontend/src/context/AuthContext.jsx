import { createContext, useState, useContext, useEffect, useCallback } from "react";
import axios from "../utils/api";

const DEMO_USERS = {
  admin: { password: "12345678", role: "Admin", name: "System Admin" },
  "admin@gmail.com": { password: "12345678", role: "Admin", name: "System Admin" },
  sales: { password: "12345678", role: "Sales", name: "Sales Manager" },
  engineering: { password: "12345678", role: "Engineering", name: "Design Lead" },
  procurement: { password: "12345678", role: "Procurement", name: "Procurement Lead", department: "Procurement", departmentId: 4 },
  "procurement@gmail.com": { password: "12345678", role: "Procurement", name: "Procurement Lead", department: "Procurement", departmentId: 4 },
  quality: { password: "12345678", role: "Quality", name: "Quality Head", department: "Quality", departmentId: 5 },
  "quality@gmail.com": { password: "12345678", role: "Quality", name: "Quality Head", department: "Quality", departmentId: 5 },
  qc: { password: "12345678", role: "QC", name: "Quality Head" },
  production: { password: "12345678", role: "Production", name: "Production Planner", department: "Production", departmentId: 3 },
  "production@gmail.com": { password: "12345678", role: "Production", name: "Production Planner", department: "Production", departmentId: 3 },
  mes: { password: "12345678", role: "MES", name: "MES Controller" },
  challan: { password: "12345678", role: "Challan", name: "Logistics Coordinator" },
  "john.doe": { password: "12345678", role: "Employee", type: "employee", name: "John Doe", designation: "Senior Engineer", department: "Design Engineer", departmentId: 2 },
  "jane.smith": { password: "12345678", role: "Supervisor", type: "employee", name: "Jane Smith", designation: "Project Supervisor", department: "Production", departmentId: 3 },
  "rajesh.kumar": { password: "12345678", role: "Employee", type: "employee", name: "Rajesh Kumar", designation: "Engineer", department: "Design Engineer", departmentId: 2 },
  "sudarshan.kale": { password: "12345678", role: "Supervisor", type: "employee", name: "Sudarshan Kale", designation: "Supervisor", department: "Production", departmentId: 3, id: 21 },
  "inventory": { password: "12345678", role: "Inventory", type: "user", name: "Inventory", department: "Inventory", departmentId: 6 },
  "inventory@gmail.com": { password: "12345678", role: "Inventory", type: "user", name: "Inventory", department: "Inventory", departmentId: 6 },
  "design_engineer": { password: "12345678", role: "Design Engineer", type: "user", name: "Design Engineer", designation: "Design Engineer", department: "Design Engineer", departmentId: 2, id: 11 },
  "design.engineer": { password: "12345678", role: "Design Engineer", type: "user", name: "Design Engineer", designation: "Design Engineer", department: "Design Engineer", departmentId: 2, id: 11 },
  "design@gmail.com": { password: "12345678", role: "Design Engineer", type: "user", name: "Design Engineer", designation: "Design Engineer", department: "Design Engineer", departmentId: 2, id: 11 },
  "accountant": { password: "12345678", role: "Admin", type: "user", name: "Accountant", department: "Accountant", departmentId: 7 },
};

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("demoUser");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    if (token === "demo-token") {
      const storedUser = localStorage.getItem("demoUser");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
      return;
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    try {
      const response = await axios.get("/auth/me", { __sessionGuard: true });
      setUser(response.data.user);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (username, password) => {
    try {
      const response = await axios.post("/auth/login", {
        username,
        password,
      });
      const { token, user: userData } = response.data;

      localStorage.setItem("token", token);
      localStorage.removeItem("demoUser");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const normalizedUsername = username?.trim().toLowerCase();
      const demoEntry = normalizedUsername ? DEMO_USERS[normalizedUsername] : null;

      if (demoEntry && password === demoEntry.password) {
        const userData = {
          id: demoEntry.id || `demo-${normalizedUsername}`,
          username: normalizedUsername,
          role: demoEntry.role,
          name: demoEntry.name,
          type: demoEntry.type || (demoEntry.role === 'employee' || demoEntry.role === 'Employee' ? 'employee' : 'user'),
          designation: demoEntry.designation,
          department: demoEntry.department,
          departmentId: demoEntry.departmentId,
        };
        localStorage.setItem("token", "demo-token");
        localStorage.setItem("demoUser", JSON.stringify(userData));
        delete axios.defaults.headers.common["Authorization"];
        setUser(userData);

        return { success: true, user: userData };
      }

      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const register = async (fullName, password, department, email) => {
    try {
      const response = await axios.post("/auth/register", {
        fullName,
        password,
        department,
        email,
      });

      return {
        success: true,
        message: response.data.message,
        userId: response.data.userId,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
