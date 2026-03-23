import { useState } from "react";
import { login } from "../services/authService";

export function useAuth() {
  const [loading, setLoading] = useState(false);

  async function signIn(email: string, password: string) {
    try {
      setLoading(true);

      const { token } = await login({ email, password });

      // salva token
      localStorage.setItem("token", token);

      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    signIn,
    loading,
  };
}