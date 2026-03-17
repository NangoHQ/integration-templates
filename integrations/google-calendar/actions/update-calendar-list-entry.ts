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
    calendarId: z.string().describe('Calendar identifier. Use "primary" for the primary calendar. Example: "primary" or "abc123@group.calendar.google.com"'),
    backgroundColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Main color in hex format (e.g., "#0088aa"). Requires color_rgb_format=true.'),
    foregroundColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Foreground color in hex format (e.g., "#ffffff"). Requires color_rgb_format=true.'),
    colorId: z.string().optional().describe('Color ID from the calendar colors endpoint'),
    hidden: z.boolean().optional().describe('Whether the calendar is hidden from the list'),
    selected: z.boolean().optional().describe('Whether the calendar content shows up in the calendar UI'),
    summaryOverride: z.string().optional().describe('Custom summary name for this calendar'),
    defaultReminders: z.array(ReminderSchema).optional().describe('Default reminders for events in this calendar'),
    notificationSettings: z
        .object({
            notifications: z.array(NotificationSchema)
        })
        .optional()
        .describe('Notification settings for this calendar'),
    colorRgbFormat: z.boolean().optional().describe('Set to true if using background_color or foreground_color')
});

const OutputSchema = z.object({
    id: z.string(),
    summary: z.string(),
    summaryOverride: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean(),
    selected: z.boolean(),
    accessRole: z.string().optional(),
    primary: z.boolean(),
    defaultReminders: z.array(
        z.object({
            method: z.string(),
            minutes: z.number()
        })
    ),
    notificationSettings: z
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

        if (input.backgroundColor !== undefined) {
            requestBody.backgroundColor = input.backgroundColor;
        }
        if (input.foregroundColor !== undefined) {
            requestBody.foregroundColor = input.foregroundColor;
        }
        if (input.colorId !== undefined) {
            requestBody.colorId = input.colorId;
        }
        if (input.hidden !== undefined) {
            requestBody.hidden = input.hidden;
        }
        if (input.selected !== undefined) {
            requestBody.selected = input.selected;
        }
        if (input.summaryOverride !== undefined) {
            requestBody.summaryOverride = input.summaryOverride;
        }
        if (input.defaultReminders !== undefined) {
            requestBody.defaultReminders = input.defaultReminders.map((r) => ({
                method: r.method,
                minutes: r.minutes
            }));
        }
        if (input.notificationSettings !== undefined) {
            requestBody.notificationSettings = {
                notifications: input.notificationSettings.notifications.map((n) => ({
                    type: n.type,
                    method: n.method
                }))
            };
        }

        const params: Record<string, string | number> = {};
        if (input.colorRgbFormat) {
            params['colorRgbFormat'] = 'true';
        }

        // https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/update
        const response = await nango.put({
            endpoint: `/calendar/v3/users/me/calendarList/${input.calendarId}`,
            data: requestBody,
            params,
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            summary: data.summary,
            summaryOverride: data.summaryOverride ?? undefined,
            description: data.description ?? undefined,
            location: data.location ?? undefined,
            timeZone: data.timeZone ?? undefined,
            colorId: data.colorId ?? undefined,
            backgroundColor: data.backgroundColor ?? undefined,
            foregroundColor: data.foregroundColor ?? undefined,
            hidden: data.hidden ?? false,
            selected: data.selected ?? false,
            accessRole: data.accessRole ?? undefined,
            primary: data.primary ?? false,
            defaultReminders: (data.defaultReminders || []).map((r: { method: string; minutes: number }) => ({
                method: r.method,
                minutes: r.minutes
            })),
            notificationSettings: data.notificationSettings
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
