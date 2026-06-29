import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"')
});

const EventFieldSchema = z.object({
    name: z.string().optional(),
    value: z.string().optional()
});

const AuditEventSchema = z
    .object({
        eventFields: z.array(EventFieldSchema).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        auditEvents: z.array(AuditEventSchema).optional()
    })
    .passthrough();

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve the audit trail for an envelope.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/get-envelope-audit-events',
        method: 'GET'
    },
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata ?? {});

        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/getenvelopeauditevents/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/audit_events`,
            retries: 3
        });

        const providerData = OutputSchema.parse(response.data);

        return {
            auditEvents: providerData.auditEvents ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
