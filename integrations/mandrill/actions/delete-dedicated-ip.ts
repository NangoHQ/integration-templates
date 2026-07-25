import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ip: z.string().describe('The dedicated IP to delete from the account. Example: "127.0.0.1"')
});

const ProviderResponseSchema = z.object({
    ip: z.string(),
    deleted: z.boolean()
});

const ProviderErrorSchema = z.object({
    status: z.string(),
    code: z.union([z.number(), z.string()]).optional(),
    name: z.string(),
    message: z.string()
});

const OutputSchema = z.object({
    ip: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a dedicated IP.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        let response;
        // @allowTryCatch The Mandrill API returns HTTP errors for missing IPs or
        // accounts without dedicated IPs enabled. We convert the provider error
        // into a structured output so callers get a graceful result instead of a
        // raw exception.
        try {
            response = await nango.post({
                // https://mailchimp.com/developer/transactional/api/ips/delete-ip-address
                endpoint: '/1.0/ips/delete',
                data: {
                    ip: input.ip
                },
                retries: 1
            });
        } catch (err) {
            let responseData = undefined;
            if (err && typeof err === 'object' && 'response' in err) {
                const errResponse = err.response;
                if (errResponse && typeof errResponse === 'object' && 'data' in errResponse) {
                    responseData = errResponse.data;
                }
            }
            const parsed = responseData !== undefined ? ProviderErrorSchema.safeParse(responseData) : undefined;
            if (parsed && parsed.success && parsed.data.name === 'Unknown_IP') {
                return {
                    ip: input.ip,
                    deleted: false
                };
            }
            if (parsed && parsed.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    name: parsed.data.name,
                    message: parsed.data.message,
                    ...(parsed.data.code !== undefined ? { code: parsed.data.code } : {})
                });
            }
            throw err;
        }

        const parsedError = ProviderErrorSchema.safeParse(response.data);
        if (parsedError.success && parsedError.data.name === 'Unknown_IP') {
            return {
                ip: input.ip,
                deleted: false
            };
        }
        if (parsedError.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                name: parsedError.data.name,
                message: parsedError.data.message,
                ...(parsedError.data.code !== undefined ? { code: parsedError.data.code } : {})
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ip: providerResponse.ip,
            deleted: providerResponse.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
