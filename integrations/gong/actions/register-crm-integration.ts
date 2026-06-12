import { createAction } from 'nango';
import * as z from 'zod';

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const InputSchema = z.object({
    ownerEmail: z.string().email(),
    name: z.string().min(1)
});

const OutputSchema = z.object({
    requestId: z.string(),
    integrationId: z.string()
});

const action = createAction({
    description: 'Register a generic CRM integration with Gong',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/register-crm-integration'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://help.gong.io/apidocs/register-a-generic-crm-integration-v2crmintegrations-1
        const handleConflict = async (requestId: string) => {
            // https://help.gong.io/apidocs/get-generic-crm-integration-details-v2crmintegrations
            const getResponse = await nango.get({
                endpoint: '/v2/crm/integrations',
                retries: 3
            });
            const getData = getResponse.data;
            if (
                typeof getData !== 'object' ||
                getData === null ||
                !('integrations' in getData) ||
                !Array.isArray(getData.integrations) ||
                getData.integrations.length === 0
            ) {
                throw new nango.ActionError({
                    message: 'An active CRM integration already exists, but details could not be retrieved'
                });
            }

            const existingIntegration = getData.integrations[0];
            if (typeof existingIntegration !== 'object' || existingIntegration === null) {
                throw new nango.ActionError({
                    message: 'An active CRM integration already exists, but details could not be retrieved'
                });
            }

            const existingIntegrationId = 'integrationId' in existingIntegration ? String(existingIntegration.integrationId) : '';

            return {
                requestId: requestId,
                integrationId: existingIntegrationId
            };
        };

        // @allowTryCatch: The real Nango SDK throws on 409 errors. In that case,
        // fetch the existing integration so the action is idempotent.
        try {
            const response = await nango.put({
                endpoint: '/v2/crm/integrations',
                data: {
                    ownerEmail: input.ownerEmail,
                    name: input.name
                },
                retries: 3
            });

            const data = response.data;
            if (typeof data !== 'object' || data === null) {
                throw new nango.ActionError({
                    message: 'Invalid response from Gong API'
                });
            }

            if (Array.isArray(data.errors)) {
                const requestId = 'requestId' in data ? String(data.requestId) : 'unknown';
                return await handleConflict(requestId);
            }

            const parsed = OutputSchema.safeParse({
                requestId: data.requestId,
                integrationId: String(data.integrationId)
            });

            if (!parsed.success) {
                throw new nango.ActionError({
                    message: 'Unexpected response shape from Gong API',
                    details: parsed.error.issues
                });
            }

            return parsed.data;
        } catch (error) {
            // The real Nango SDK throws on 409 errors. In that case,
            // fetch the existing integration so the action is idempotent.
            const parsedErr = AxiosErrorSchema.safeParse(error);
            const errStatus = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status ?? null) : null;

            if (errStatus !== 409) {
                throw error;
            }

            const respData = parsedErr.success ? parsedErr.data.response?.data : null;
            const requestId = typeof respData === 'object' && respData !== null && 'requestId' in respData ? String(respData['requestId']) : 'unknown';

            return await handleConflict(requestId);
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
