import axios from "axios";
import { API_BASE } from "./timelineUtils";
import type { ApiTimelineResponse, ApiChatCreateRequest, ApiChatEntry, ApiChatUpdateRequest } from "./timelineTypes";

export async function apiFetchTaskDefs() {
    const res = await axios.get(`${API_BASE}/task-definitions`, {
        withCredentials: true,
    });
    return res.data as { id: number; name: string; color: string }[];
}

export async function apiFetchTimeline(date: string) {
    const res = await axios.get(`${API_BASE}`, {
        params: {date},
        withCredentials: true,
    });
    return res.data as ApiTimelineResponse;
}

export async function apiCreateChat(payload: ApiChatCreateRequest) {
  const res = await axios.post(`${API_BASE}/chat`, payload, {
    withCredentials: true,
  });
  return res.data as ApiChatEntry;
}

export async function apiUpdateChat(id: number, payload: ApiChatUpdateRequest) {
  const res = await axios.patch(`${API_BASE}/chat/${id}`, payload, {
    withCredentials: true,
  });
  return res.data as ApiChatEntry;
}

export async function apiDeleteChat(id: number) {
  await axios.delete(`${API_BASE}/chat/${id}`, {
    withCredentials: true,
  });
}

export async function apiCreateTaskDef(name: string, color: string) {
  const res = await axios.post(
    `${API_BASE}/task-definitions`,
    null,
    {
      params: { name, color },
      withCredentials: true,
    }
  );
  return res.data as { id: number; name: string; color: string };
}