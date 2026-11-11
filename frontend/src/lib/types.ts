// Hand-written mirrors of the Pydantic models in backend/models/models.py.
// Nothing infers across the HTTP boundary — keep this file in sync in the same edit.

export interface Agent {
  id: string;
  key: string;
  name: string;
  role_pt: string;
  role_en: string;
  description_pt: string;
  description_en: string;
  provider: string;
  model: string;
  brain: string;
  status: string;
  open_tasks: number;
  created_at: string;
}

export interface Mission {
  id: string;
  text: string;
  status: string; // planning | delegating | completed | failed
  plan_intro: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  mission_id: string;
  mission_text: string;
  agent_key: string;
  title: string;
  detail: string;
  status: string; // queued | working | done | failed
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomMessage {
  id: string;
  sender_key: string; // user | zero | pro | jarvis | aluna | plus | system
  kind: string; // chat | delegation | system | summary
  content: string;
  mission_id: string | null;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  role: string; // user | zero
  content: string;
  created_at: string;
}

export interface Channel {
  id: string;
  key: string; // whatsapp | facebook | internet | visual | mcp
  name: string;
  description_pt: string;
  description_en: string;
  status: string; // connected | disconnected
  config: Record<string, string>;
  updated_at: string;
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  engine: string;
  results: SearchHit[];
}

export interface SystemInfo {
  app: string;
  llm_configured: boolean;
  brain: string; // cloud | simulated
}

export interface Briefing {
  id: string;
  day: string; // YYYY-MM-DD (America/Sao_Paulo)
  city: string;
  content: string;
  created_at: string;
}

export interface BriefingSettings {
  auto: boolean;
  hour: number;
  city: string;
}
