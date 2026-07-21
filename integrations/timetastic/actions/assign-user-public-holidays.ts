import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().int().describe('The user ID in Timetastic. Example: 1523000'),
    countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code. Example: "GB"'),
    regionCode: z.string().optional().describe('ISO 3166-2 region code. Takes precedence over countryCode. Example: "ES-AN"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Turn on and assign a public holiday set (country/region) to a user',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.countryCode && !input.regionCode) {
            throw new nango.ActionError({
                type: 'missing_parameter',
                message: 'Either countryCode or regionCode must be provided.'
            });
        }

        const body: { countryCode?: string; regionCode?: string } = {};
        if (input.countryCode !== undefined) {
            body.countryCode = input.countryCode;
        }
        if (input.regionCode !== undefined) {
            body.regionCode = input.regionCode;
        }

        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://app.timetastic.co.uk/swagger/v1/swagger.json
        try {
            await nango.patch({
                endpoint: `/users/${encodeURIComponent(input.userId)}/publicholidays`,
                data: body,
                retries: 3
            });
        } catch (err: unknown) {
            const status =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'status' in err.response
                    ? err.response.status
                    : undefined;
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Timetastic returned status ${status ?? 'unknown error'}`
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
