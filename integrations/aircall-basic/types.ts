export interface AircallUser {
  id: number;
  direct_link: string;
  name: string;
  email: string;
  available: boolean;
  availability_status: "available" | "unavailable" | "offline"; 
  created_at: string; 
  time_zone: string;
  language: string;
  substatus: "always_opened" | "closed" | "away"; 
  wrap_up_time: number;
}
