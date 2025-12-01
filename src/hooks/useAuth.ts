// src/hooks/useAuth.ts
import axios from "axios";
import { useEffect, useState } from "react";

interface MeResponse {
  authenticated: boolean;
  id?: number;
  nickname?: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

export function useAuth() {
  const [user, setUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get<MeResponse>(`${API_BASE}/api/me`, {
          withCredentials: true,
        });

        if (!cancelled) {
          setUser(res.data);
        }
      } catch (e) {
        console.error("me 호출 실패", e);
        if (!cancelled) {
          setUser({authenticated: false});
        }
      }
    })();
    return () => {
      cancelled = true;
    }
  }, []);

  return user;
}
