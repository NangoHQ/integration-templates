import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticketId: z.string().describe('Ticket ID. Example: "1892000000042034"')
});

const ProviderSourceSchema = z
    .object({
        appName: z.unknown().optional(),
        extId: z.unknown().optional(),
        type: z.string().optional(),
        permalink: z.unknown().optional(),
        uuid: z.unknown().optional(),
        appPhotoURL: z.unknown().optional()
    })
    .optional();

const ProviderContactSchema = z
    .object({
        lastName: z.string().optional(),
        firstName: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        id: z.string().optional(),
        isSpam: z.boolean().optional(),
        type: z.unknown().optional(),
        email: z.string().optional(),
        account: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough()
    .optional();

const ProviderDepartmentSchema = z
    .object({
        name: z.string().optional(),
        id: z.string().optional()
    })
    .passthrough()
    .optional();

const ProviderAssigneeSchema = z
    .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        photoURL: z.string().optional(),
        id: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough()
    .optional();

const ProviderTeamSchema = z
    .object({
        name: z.string().optional(),
        id: z.string().optional(),
        logoUrl: z.string().optional()
    })
    .passthrough()
    .optional();

const ProviderTicketSchema = z
    .object({
        id: z.string(),
        ticketNumber: z.string().optional(),
        subject: z.string().optional(),
        status: z.string().optional(),
        statusType: z.string().optional(),
        priority: z.string().nullable().optional(),
        departmentId: z.string().optional(),
        contactId: z.string().optional(),
        assigneeId: z.string().optional(),
        productId: z.string().nullable().optional(),
        createdTime: z.string().optional(),
        modifiedTime: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        closedTime: z.string().nullable().optional(),
        onholdTime: z.string().nullable().optional(),
        channel: z.string().optional(),
        language: z.string().optional(),
        description: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        webUrl: z.string().optional(),
        isSpam: z.boolean().optional(),
        isRead: z.boolean().optional(),
        isTrashed: z.boolean().optional(),
        isDeleted: z.union([z.boolean(), z.string()]).optional(),
        isOverDue: z.boolean().optional(),
        isFollowing: z.union([z.boolean(), z.string()]).optional(),
        threadCount: z.string().optional(),
        commentCount: z.string().optional(),
        taskCount: z.string().optional(),
        timeEntryCount: z.string().optional(),
        followerCount: z.string().optional(),
        sharedCount: z.string().optional(),
        approvalCount: z.string().optional(),
        customerResponseTime: z.string().optional(),
        resolution: z.string().nullable().optional(),
        classification: z.string().nullable().optional(),
        subCategory: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        source: ProviderSourceSchema,
        contact: ProviderContactSchema,
        department: ProviderDepartmentSchema,
        assignee: ProviderAssigneeSchema,
        team: ProviderTeamSchema,
        product: z.record(z.string(), z.unknown()).nullable().optional(),
        channelRelatedInfo: z.record(z.string(), z.unknown()).nullable().optional(),
        layoutDetails: z.record(z.string(), z.unknown()).optional(),
        cf: z.record(z.string(), z.unknown()).optional(),
        secondaryContacts: z.array(z.string()).optional(),
        sharedDepartments: z.array(z.record(z.string(), z.unknown())).optional(),
        entitySkills: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = ProviderTicketSchema;

const action = createAction({
    description: 'Retrieve a ticket.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-ticket',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfigSchema = z.object({
            extension: z.string().optional()
        });
        const connectionConfig = connectionConfigSchema.parse(connection.connection_config || {});
        const extension = connectionConfig.extension || 'com';
        const baseUrlOverride = `https://desk.zoho.${extension}/api/v1`;

        // https://desk.zoho.com/DeskAPIDocument#Tickets%23Tickets_Getaticket
        const response = await nango.get({
            endpoint: `tickets/${encodeURIComponent(input.ticketId)}`,
            baseUrlOverride,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found',
                ticketId: input.ticketId
            });
        }

        const providerTicket = ProviderTicketSchema.parse(response.data);

        return providerTicket;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
