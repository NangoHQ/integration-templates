export interface ZoomCreatedUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    type: number;
    zoom_workplace: number;
    on_prem: boolean;
}

export interface ZoomUser extends ZoomCreatedUser {
  display_name: string;
  pmi: number;
  timezone: string;
  verified: number;
  dept: string;
  created_at: string;
  last_login_time: string;
  pic_url: string;
  language: string;
  phone_number: string;
  status: string;
  role_id: string;
  user_created_at: string;
}

