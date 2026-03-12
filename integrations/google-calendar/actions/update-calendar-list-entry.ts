import { z } from 'zod';
import { createAction } from 'nango';

const ReminderSchema = z.object({
    method: z.enum(['email', 'popup']),
    minutes: z.number().int().min(0).max(40320)
});

const NotificationSchema = z.object({
    type: z.enum(['eventCreation', 'eventChange', 'eventCancellation', 'eventResponse', 'agenda']),
    method: z.enum(['email'])
});

const InputSchema = z.object({
    calendar_id: z.string().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"'),
    background_color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Main color in hex format (e.g., "#0088aa"). Requires color_rgb_format=true.'),
    foreground_color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Foreground color in hex format (e.g., "#ffffff"). Requires color_rgb_format=true.'),
    color_id: z.string().optional().describe('Color ID from the calendar colors endpoint'),
    hidden: z.boolean().optional().describe('Whether the calendar is hidden from the list'),
    selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI'),
    summary_override: z.string().optional().describe('Custom summary name for this calendar'),
    default_reminders: z.array(ReminderSchema).optional().describe('Default reminders for events in this calendar'),
    notification_settings: z
        .object({
            notifications: z.array(NotificationSchema)
        })
        .optional()
        .describe('Notification settings for this calendar'),
    color_rgb_format: z.boolean().optional().describe('Set to true if using background_color or foreground_color')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    summary_override: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    location: z.union([z.string(), z.null()]),
    time_zone: z.union([z.string(), z.null()]),
    color_id: z.union([z.string(), z.null()]),
    background_color: z.union([z.string(), z.null()]),
    foreground_color: z.union([z.string(), z.null()]),
    hidden: z.boolean(),
    selected: z.boolean(),
    access_role: z.union([z.string(), z.null()]),
    primary: z.boolean(),
    default_reminders: z.array(
        z.object({
            method: z.string(),
            minutes: z.number()
        })
    ),
    notification_settings: z
        .object({
            notifications: z.array(
                z.object({
                    type: z.string(),
                    method: z.string()
                })
            )
        })
        .optional()
});

const action = createAction({
    description: "Update a calendar list entry's settings",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-calendar-list-entry',
        group: 'Calendars'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        interface CalendarListRequest {
            backgroundColor?: string;
            foregroundColor?: string;
            colorId?: string;
            hidden?: boolean;
            selected?: boolean;
            summaryOverride?: string;
            defaultReminders?: Array<{ method: string; minutes: number }>;
            notificationSettings?: {
                notifications: Array<{ type: string; method: string }>;
            };
        }

        const requestBody: CalendarListRequest = {};

        if (input.background_color !== undefined) {
            requestBody.backgroundColor = input.background_color;
        }
        if (input.foreground_color !== undefined) {
            requestBody.foregroundColor = input.foreground_color;
        }
        if (input.color_id !== undefined) {
            requestBody.colorId = input.color_id;
        }
        if (input.hidden !== undefined) {
            requestBody.hidden = input.hidden;
        }
        if (input.selected !== undefined) {
            requestBody.selected = input.selected;
        }
        if (input.summary_override !== undefined) {
            requestBody.summaryOverride = input.summary_override;
        }
        if (input.default_reminders !== undefined) {
            requestBody.defaultReminders = input.default_reminders.map((r) => ({
                method: r.method,
                minutes: r.minutes
            }));
        }
        if (input.notification_settings !== undefined) {
            requestBody.notificationSettings = {
                notifications: input.notification_settings.notifications.map((n) => ({
                    type: n.type,
                    method: n.method
                }))
            };
        }

        const params: Record<string, string | number> = {};
        if (input.color_rgb_format) {
            params['colorRgbFormat'] = 'true';
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/update
        const response = await nango.put({
            endpoint: `/calendar/v3/users/me/calendarList/${input.calendar_id}`,
            data: requestBody,
            params,
            retries: 1
        });

        const data = response.data;

        return {
            id: data.id,
            summary: data.summary,
            summary_override: data.summaryOverride ?? null,
            description: data.description ?? null,
            location: data.location ?? null,
            time_zone: data.timeZone ?? null,
            color_id: data.colorId ?? null,
            background_color: data.backgroundColor ?? null,
            foreground_color: data.foregroundColor ?? null,
            hidden: data.hidden ?? false,
            selected: data.selected ?? false,
            access_role: data.accessRole ?? null,
            primary: data.primary ?? false,
            default_reminders: (data.defaultReminders || []).map((r: { method: string; minutes: number }) => ({
                method: r.method,
                minutes: r.minutes
            })),
            notification_settings: data.notificationSettings
                ? {
                      notifications: data.notificationSettings.notifications.map((n: { type: string; method: string }) => ({
                          type: n.type,
                          method: n.method
                      }))
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
