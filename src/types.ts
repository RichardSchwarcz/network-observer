export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response?: NetworkResponse;
  timestamp: number;
  duration?: number;
}

export interface NetworkResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body?: string;
}

