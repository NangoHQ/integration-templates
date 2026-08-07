import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountUuid: z.string().describe('Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"')
});

const InputSchema = z.object({
    startTime: z.string().optional().describe('Start time in ISO 8601 format. Example: "2024-01-01T00:00:00Z"'),
    endTime: z.string().optional().describe('End time in ISO 8601 format. Example: "2024-01-02T00:00:00Z"'),
    addFields: z.string().optional().describe('Comma-separated list of additional fields to include. Example: "eventOutcome,accountUuid"'),
    filter: z.string().optional().describe('Query filter expression.'),
    limit: z.number().optional().describe('Maximum number of audit entries to return.'),
    scanLimitGigabyte: z.number().optional().describe('Scan limit in gigabytes.'),
    resultSizeLimitMegabyte: z.number().optional().describe('Result size limit in megabytes.')
});

const ProviderAuditSchema = z
    .object({
        eventId: z.string(),
        timestamp: z.string(),
        user: z.string(),
        resource: z.string(),
        resourceName: z.string(),
        eventProvider: z.string(),
        eventType: z.string(),
        accountUuid: z.string().optional(),
        eventOutcome: z.string().optional()
    })
    .passthrough();

const ProviderWarningSchema = z.object({
    message: z.string()
});

const ProviderResponseSchema = z.object({
    audits: z.array(ProviderAuditSchema),
    warnings: z.array(ProviderWarningSchema).optional(),
    totalCount: z.number().optional()
});

const AuditSchema = z
    .object({
        eventId: z.string(),
        timestamp: z.string(),
        user: z.string(),
        resource: z.string(),
        resourceName: z.string(),
        eventProvider: z.string(),
        eventType: z.string(),
        accountUuid: z.string().optional(),
        eventOutcome: z.string().optional()
    })
    .passthrough();

const WarningSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    audits: z.array(AuditSchema),
    warnings: z.array(WarningSchema).optional(),
    totalCount: z.number().optional()
});

const action = createAction({
    description: 'Query the account-level audit log (IAM changes: user/group/policy/permission create-update-delete events).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['account-audit-logs-read'],

    exec: async (nango, input) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountUuid is required in metadata.'
            });
        }
        const accountUuid = parsedMetadata.data.accountUuid;

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountUuid is required in metadata.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/account-audit-logs-api/get-account-audit-log
            endpoint: `/audit/v1/accounts/${encodeURIComponent(accountUuid)}`,
            params: {
                ...(input.startTime !== undefined && { startTime: input.startTime }),
                ...(input.endTime !== undefined && { endTime: input.endTime }),
                ...(input.addFields !== undefined && { addFields: input.addFields }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.scanLimitGigabyte !== undefined && { scanLimitGigabyte: String(input.scanLimitGigabyte) }),
                ...(input.resultSizeLimitMegabyte !== undefined && { resultSizeLimitMegabyte: String(input.resultSizeLimitMegabyte) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            audits: providerResponse.audits,
            ...(providerResponse.warnings !== undefined && { warnings: providerResponse.warnings }),
            ...(providerResponse.totalCount !== undefined && { totalCount: providerResponse.totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
