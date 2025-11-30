// src/hooks/useAuth.ts
import { useEffect, useState } from "react";

interface MeResponse {
  authenticated: boolean;
  id?: number;
  nickname?: string;
}

const API_BASE =
  import.meta.env.DEV ? "http://localhost:8080" : "";

export function useAuth() {
  const [user, setUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include", // ✅ 세션 쿠키 같이 보내기
        });

        const data: MeResponse = await res.json();
        setUser(data);
      } catch (e) {
        console.error("me 호출 실패", e);
        setUser({ authenticated: false });
      }
    })();
  }, []);

  return user;
}
