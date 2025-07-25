import { z } from "zod";

export const Timestamps = z.object({
  created_at: z.string(),
  start_at: z.string(),
  end_at: z.string()
});

export type Timestamps = z.infer<typeof Timestamps>;

export const GeoAddress = z.object({
  city: z.string(),
  type: z.string(),
  region: z.string(),
  address: z.string(),
  country: z.string(),
  latitude: z.string(),
  place_id: z.string(),
  longitude: z.string(),
  city_state: z.string(),
  description: z.string(),
  full_address: z.string()
});

export type GeoAddress = z.infer<typeof GeoAddress>;

export const Event = z.object({
  id: z.string(),
  created_at: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  cover_url: z.string(),
  name: z.string(),
  description: z.string(),
  description_md: z.string(),
  series_api_id: z.union([z.string(), z.null()]),
  duration_interval_iso8601: z.string(),
  geo_latitude: z.union([z.string(), z.null()]),
  geo_longitude: z.union([z.string(), z.null()]),
  geo_address_json: z.union([GeoAddress, z.null()]),
  url: z.string(),
  timezone: z.string(),
  event_type: z.string(),
  user_api_id: z.string(),
  visibility: z.string(),
  meeting_url: z.union([z.string(), z.null()]),
  zoom_meeting_url: z.union([z.string(), z.null()])
});

export type Event = z.infer<typeof Event>;

export const models = {
  Timestamps: Timestamps,
  GeoAddress: GeoAddress,
  Event: Event
};