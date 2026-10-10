import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe(
                'Day to list external durations for, in YYYY-MM-DD format, interpreted in the user\'s timezone unless timezone is supplied. Example: "2026-10-09"'
            ),
        project: z.string().optional().describe('Only return external durations for this project name. Example: "nango-wakatime-test-project"'),
        branches: z.string().optional().describe('Comma-separated list of branch names to filter by. Example: "main,develop"'),
        timezone: z
            .string()
            .optional()
            .describe('Timezone used to interpret date, in Olson Country/Region format. Defaults to the user\'s timezone. Example: "America/Los_Angeles"')
    })
    .describe('Filters for listing externally-reported duration blocks for a single day.');

const ProviderExternalDurationSchema = z.object({
    id: z.string(),
    external_id: z.string().nullish(),
    entity: z.string().nullish(),
    type: z.string().nullish(),
    provider: z.string().nullish(),
    category: z.string().nullish(),
    start_time: z.number().nullish(),
    end_time: z.number().nullish(),
    project: z.string().nullish(),
    branch: z.string().nullish(),
    language: z.string().nullish(),
    meta: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderExternalDurationSchema),
    start: z.string().nullish(),
    end: z.string().nullish(),
    timezone: z.string().nullish()
});

const OutputDurationSchema = z.object({
    id: z.string().describe('Unique identifier of this external duration. Example: "a1b2c3d4e5f6..."'),
    external_id: z.string().optional().describe('Identifier for this duration on the external provider, used to avoid duplicates.'),
    entity: z.string().optional().describe('Entity the duration logs time against, such as a domain or an event title.'),
    type: z.string().optional().describe('Entity type. One of "file", "app", "event", "url", or "domain".'),
    provider: z.string().optional().describe('External app that created this activity. Example: "Google Calendar"'),
    category: z.string().optional().describe('Activity category. Example: "communicating"'),
    start_time: z.number().optional().describe('Start of the duration as a UNIX epoch timestamp in seconds.'),
    end_time: z.number().optional().describe('End of the duration as a UNIX epoch timestamp in seconds.'),
    project: z.string().optional().describe('Project associated with the duration, if any.'),
    branch: z.string().optional().describe('Branch associated with the duration, if any.'),
    language: z.string().optional().describe('Programming language associated with the duration, if any.'),
    meta: z.string().optional().describe('Free-form metadata string supplied by the external provider, if any.')
});

const OutputSchema = z
    .object({
        durations: z.array(OutputDurationSchema).describe('External duration blocks reported by non-WakaTime sources for the requested day.'),
        start: z.string().optional().describe('Start of the requested day range as an ISO 8601 UTC datetime.'),
        end: z.string().optional().describe('End of the requested day range as an ISO 8601 UTC datetime.'),
        timezone: z.string().optional().describe('Timezone used to interpret the requested day, in Olson Country/Region format.')
    })
    .describe('External duration blocks reported by non-WakaTime sources for the requested day, plus the resolved day range.');

/**
 * @tags: [read]
 * @tagReason: Reads externally-reported duration blocks from the provider and does not create, modify, or delete anything.
 * @pitfalls: Returns an empty list unless a separate external integration (for example Google Calendar) has reported time for that day, and those records disappear if the user disconnects that integration; date is interpreted in the user's timezone (or the supplied timezone), so the returned start/end can be shifted away from UTC day boundaries.
 */
const action = createAction({
    description: 'List externally-reported duration blocks for a single day.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_heartbeats'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://wakatime.com/developers#external_durations
            endpoint: '/api/v1/users/current/external_durations',
            params: {
                date: input.date,
                ...(input.project !== undefined && { project: input.project }),
                ...(input.branches !== undefined && { branches: input.branches }),
                ...(input.timezone !== undefined && { timezone: input.timezone })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            durations: parsed.data.map((duration) => ({
                id: duration.id,
                ...(duration.external_id != null && { external_id: duration.external_id }),
                ...(duration.entity != null && { entity: duration.entity }),
                ...(duration.type != null && { type: duration.type }),
                ...(duration.provider != null && { provider: duration.provider }),
                ...(duration.category != null && { category: duration.category }),
                ...(duration.start_time != null && { start_time: duration.start_time }),
                ...(duration.end_time != null && { end_time: duration.end_time }),
                ...(duration.project != null && { project: duration.project }),
                ...(duration.branch != null && { branch: duration.branch }),
                ...(duration.language != null && { language: duration.language }),
                ...(duration.meta != null && { meta: duration.meta })
            })),
            ...(parsed.start != null && { start: parsed.start }),
            ...(parsed.end != null && { end: parsed.end }),
            ...(parsed.timezone != null && { timezone: parsed.timezone })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
