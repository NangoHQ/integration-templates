import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The id of the event. Example: "3ed9b6ad"')
});

const ProviderEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    type: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    cancelled: z.boolean().optional(),
    job: z
        .object({
            shortcode: z.string(),
            title: z.string()
        })
        .optional(),
    members: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                status: z.string()
            })
        )
        .optional(),
    candidate: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    conference: z
        .object({
            type: z.string(),
            id: z.union([z.string(), z.number()]),
            url: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    type: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    cancelled: z.boolean().optional(),
    job: z
        .object({
            shortcode: z.string(),
            title: z.string()
        })
        .optional(),
    members: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                status: z.string()
            })
        )
        .optional(),
    candidate: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    conference: z
        .object({
            type: z.string(),
            id: z.union([z.string(), z.number()]),
            url: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve a single scheduled event by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/events-show
            endpoint: `/spi/v3/events/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                id: input.id
            });
        }

        const providerEvent = ProviderEventSchema.parse(response.data);

        return {
            id: providerEvent.id,
            title: providerEvent.title,
            ...(providerEvent.description != null && { description: providerEvent.description }),
            type: providerEvent.type,
            starts_at: providerEvent.starts_at,
            ends_at: providerEvent.ends_at,
            ...(providerEvent.cancelled !== undefined && { cancelled: providerEvent.cancelled }),
            ...(providerEvent.job !== undefined && { job: providerEvent.job }),
            ...(providerEvent.members !== undefined && { members: providerEvent.members }),
            ...(providerEvent.candidate !== undefined && { candidate: providerEvent.candidate }),
            ...(providerEvent.conference !== undefined && { conference: providerEvent.conference })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
