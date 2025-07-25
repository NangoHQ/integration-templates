import { z } from "zod";

export const OptionalBackfillSetting = z.object({
  backfillPeriodDays: z.number()
});

export type OptionalBackfillSetting = z.infer<typeof OptionalBackfillSetting>;

export const IdEntity = z.object({
  id: z.string()
});

export type IdEntity = z.infer<typeof IdEntity>;

export const SuccessResponse = z.object({
  success: z.boolean()
});

export type SuccessResponse = z.infer<typeof SuccessResponse>;

export const ActionResponseError = z.object({
  message: z.string()
});

export type ActionResponseError = z.infer<typeof ActionResponseError>;

export const CreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type CreateUser = z.infer<typeof CreateUser>;

export const ZoomCreateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),

  action: z.union([
    z.literal("create"),
    z.literal("autoCreate"),
    z.literal("custCreate"),
    z.literal("ssoCreate")
  ]).optional(),

  display_name: z.string().optional(),

  type: z.union([
    z.literal("basic"),
    z.literal("licensed"),
    z.literal("UnassignedWithoutMeetingsBasic"),
    z.literal("None")
  ]).optional()
});

export type ZoomCreateUser = z.infer<typeof ZoomCreateUser>;

export const User = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string()
});

export type User = z.infer<typeof User>;

export const UserInformation = z.object({
  id: z.string(),
  email: z.string()
});

export type UserInformation = z.infer<typeof UserInformation>;

export const Meeting = z.object({
  id: z.string(),
  topic: z.string(),
  startTime: z.string(),
  duration: z.number(),
  timezone: z.string(),
  joinUrl: z.string(),
  createdAt: z.string()
});

export type Meeting = z.infer<typeof Meeting>;

export const CreateMeeting = z.object({
  topic: z.string(),

  type: z.union([
    z.literal("instant"),
    z.literal("scheduled"),
    z.literal("recurringNoFixed"),
    z.literal("recurring"),
    z.literal("screenShareOnly")
  ]),

  agenda: z.string().optional(),
  default_password: z.boolean().optional(),
  duration: z.number().optional(),
  password: z.string().optional(),
  pre_schedule: z.boolean().optional(),

  recurrence: z.object({
    end_date_time: z.string().optional(),
    end_times: z.number().optional(),
    monthly_day: z.number().optional(),
    monthly_week: z.number().optional(),
    monthly_week_day: z.number().optional(),
    repeat_interval: z.number().optional(),
    type: z.union([z.literal("daily"), z.literal("weekly"), z.literal("monthly")]).optional(),

    weekly_days: z.union([
      z.literal("sunday"),
      z.literal("monday"),
      z.literal("tuesday"),
      z.literal("wednesday"),
      z.literal("thursday"),
      z.literal("friday"),
      z.literal("saturday")
    ]).optional()
  }).optional(),

  settings: z.object({
    host_video: z.boolean().optional(),
    participant_video: z.boolean().optional(),
    join_before_host: z.boolean().optional(),
    mute_upon_entry: z.boolean().optional(),
    approval_type: z.union([z.literal("automatic"), z.literal("manually"), z.literal("notRequired")]).optional(),

    registration_type: z.union([
      z.literal("registerOnceAttendAny"),
      z.literal("registerEveryTime"),
      z.literal("registerOnceSelectOccurrences")
    ]).optional(),

    audio: z.union([
      z.literal("both"),
      z.literal("telephony"),
      z.literal("voip"),
      z.literal("thirdParty")
    ]).optional(),

    auto_recording: z.union([z.literal("local"), z.literal("cloud"), z.literal("none")]).optional(),
    waiting_room: z.boolean()
  }).optional(),

  schedule_for: z.string().optional(),
  start_time: z.string().optional(),
  template_id: z.string().optional(),
  timezone: z.string().optional()
});

export type CreateMeeting = z.infer<typeof CreateMeeting>;

export const RecordingFile = z.object({
  id: z.string(),
  deletedTime: z.string().optional(),
  downloadUrl: z.string(),
  filePath: z.string().optional(),
  fileSize: z.number(),

  fileType: z.union([
    z.literal("MP4"),
    z.literal("M4A"),
    z.literal("CHAT"),
    z.literal("TRANSCRIPT"),
    z.literal("CSV"),
    z.literal("TB"),
    z.literal("CC"),
    z.literal("CHAT_MESSAGE"),
    z.literal("SUMMARY"),
    z.literal("TIMELINE")
  ]),

  fileExtension: z.union([
    z.literal("MP4"),
    z.literal("M4A"),
    z.literal("TXT"),
    z.literal("VTT"),
    z.literal("CSV"),
    z.literal("JSON"),
    z.literal("JPG")
  ]),

  meetingId: z.string(),
  playUrl: z.string().optional(),
  recordingEnd: z.string(),
  recordingStart: z.string(),

  recordingType: z.union([
    z.literal("shared_screen_with_speaker_view(CC)"),
    z.literal("shared_screen_with_speaker_view"),
    z.literal("shared_screen_with_gallery_view"),
    z.literal("active_speaker"),
    z.literal("gallery_view"),
    z.literal("shared_screen"),
    z.literal("audio_only"),
    z.literal("audio_transcript"),
    z.literal("chat_file"),
    z.literal("poll"),
    z.literal("host_video"),
    z.literal("closed_caption"),
    z.literal("timeline"),
    z.literal("thumbnail"),
    z.literal("audio_interpretation"),
    z.literal("summary"),
    z.literal("summary_next_steps"),
    z.literal("summary_smart_chapters"),
    z.literal("sign_interpretation"),
    z.literal("production_studio")
  ]),

  status: z.literal("completed"),
  autoDelete: z.boolean().optional(),
  autoDeleteDate: z.string().optional(),
  playPasscode: z.string()
});

export type RecordingFile = z.infer<typeof RecordingFile>;

export const models = {
  OptionalBackfillSetting: OptionalBackfillSetting,
  IdEntity: IdEntity,
  SuccessResponse: SuccessResponse,
  ActionResponseError: ActionResponseError,
  CreateUser: CreateUser,
  ZoomCreateUser: ZoomCreateUser,
  User: User,
  UserInformation: UserInformation,
  Meeting: Meeting,
  CreateMeeting: CreateMeeting,
  RecordingFile: RecordingFile
};