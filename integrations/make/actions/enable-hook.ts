import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    hookId: z.string().describe('The unique ID of the hook to enable')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Enable a disabled hook to start accepting incoming data',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        const hookId = input.hookId;

        // https://developers.make.com/api-documentation/#tag/Hooks/operation/enableHook
        const response = await nango.post({
            endpoint: `/hooks/${encodeURIComponent(hookId)}/enable`,
            retries: 1
        });

        const raw: unknown = response.data;
        if (typeof raw !== 'object' || raw === null) {
            throw new nango.ActionError({ message: 'Unexpected response from provider: expected an object' });
        }

        const parsed = OutputSchema.safeParse(raw);
        if (!parsed.success) {
            throw new nango.ActionError({ message: `Provider response validation failed: ${parsed.error.message}` });
        }

        return parsed.data;
    }
});

export default action;
