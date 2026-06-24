import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const EntitySchema = z
    .object({
        objectId: z.string().describe('CRM unique ID for the entity. Max 64 chars. Example: "12345"'),
        modifiedDate: z.string().describe('ISO-8601 datetime without milliseconds when the entity was last modified. Example: "2026-01-15T10:00:00Z"'),
        isDeleted: z.boolean().optional().describe('When true, deletes the object from the database. Default: false'),
        url: z.string().optional().describe('Qualified URI to view this object in the CRM')
    })
    .passthrough();

const InputSchema = z.object({
    integrationId: z.string().describe('CRM integration ID generated when creating the integration. Example: "6286478263646"'),
    entityType: z.enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD', 'BUSINESS_USER', 'STAGE']).describe('CRM object type being uploaded. Case-sensitive.'),
    entities: z.array(EntitySchema).describe('Array of CRM entity objects to upload. All objects must be of the same entityType.'),
    clientRequestId: z
        .string()
        .optional()
        .describe('Unique identifier for troubleshooting and deduplication. Valid characters: letters, numbers, dashes, and underscores.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    clientRequestId: z.string().nullish(),
    errors: z.array(z.string()).nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    clientRequestId: z.string().nullish(),
    errors: z.array(z.string()).nullish()
});

const action = createAction({
    description: 'Upload CRM objects (accounts, contacts, deals, leads) to Gong.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:crm:upload'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.entities.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'entities array must not be empty'
            });
        }

        const ndjson = input.entities.map((entity) => JSON.stringify(entity)).join('\n');
        const boundary = '----FormBoundaryNangoFixed';
        const body = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="dataFile"; filename="entities.ldjson"',
            'Content-Type: application/x-ndjson',
            '',
            ndjson,
            `--${boundary}--`,
            ''
        ].join('\r\n');

        const config: ProxyConfiguration = {
            // https://help.gong.io/docs/crm-integrations
            endpoint: '/v2/crm/entities',
            params: {
                integrationId: input.integrationId,
                objectType: input.entityType,
                ...(input.clientRequestId !== undefined && { clientRequestId: input.clientRequestId })
            },
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            data: body,
            retries: 3
        };

        let responseData: unknown;

        // @allowTryCatch The Gong proxy may return non-2xx for plan-gated or malformed multipart requests
        try {
            const response = await nango.post(config);
            responseData = response.data;
        } catch (error) {
            if (
                error !== null &&
                typeof error === 'object' &&
                'response' in error &&
                error.response !== null &&
                typeof error.response === 'object' &&
                'data' in error.response
            ) {
                responseData = error.response.data;
            } else {
                throw error;
            }
        }

        const providerResponse = ProviderResponseSchema.parse(responseData);

        return {
            ...(providerResponse.requestId !== undefined && { requestId: providerResponse.requestId }),
            ...(providerResponse.clientRequestId !== undefined && { clientRequestId: providerResponse.clientRequestId }),
            ...(providerResponse.errors !== undefined && { errors: providerResponse.errors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
