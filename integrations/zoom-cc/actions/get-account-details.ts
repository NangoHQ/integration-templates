import { createAction } from 'nango';
import * as z from 'zod';

const OutputSchema = z.object({
    id: z.string(),
    account_name: z.string(),
    account_number: z.number().optional(),
    owner_id: z.string(),
    owner_email: z.string(),
    account_type: z.string(),
    seats: z.number(),
    subscription_start_time: z.string().optional(),
    subscription_end_time: z.string().optional(),
    created_at: z.string(),
    reseller: z.boolean().optional()
});

const action = createAction({
    description: "Get the connected account's own basic details (plan type, seats, owner, creation date).",
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    scopes: ['account:read:admin'],
    exec: async (nango, _input) => {
        // https://developers.zoom.us/docs/api/
        const response = await nango.get({
            endpoint: '/accounts/me',
            baseUrlOverride: 'https://api.zoom.us/v2',
            retries: 3
        });

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw new nango.ActionError({ message: 'Invalid response from Zoom API: expected an object' });
        }

        const parsed = OutputSchema.safeParse(raw);
        if (!parsed.success) {
            throw new nango.ActionError({ message: `Response validation failed: ${parsed.error.message}` });
        }

        return parsed.data;
    }
});

export default action;
