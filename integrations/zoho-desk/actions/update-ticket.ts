import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticketId: z.string().describe('The unique ID of the ticket to update. Example: "18920000000054003"'),
    subject: z.string().optional().describe('Subject of the ticket.'),
    departmentId: z.string().optional().describe('ID of the department to which the ticket belongs.'),
    contactId: z.string().optional().describe('ID of the contact who raised the ticket.'),
    productId: z.string().optional().describe('ID of the product to which the ticket is mapped.'),
    email: z.string().optional().describe('Email address of the contact.'),
    phone: z.string().optional().describe('Phone number of the contact.'),
    description: z.string().optional().describe('Description of the ticket.'),
    status: z.string().optional().describe('Status of the ticket. Example: "Open" or "Closed"'),
    assigneeId: z.string().optional().describe('ID of the agent to whom the ticket is assigned.'),
    category: z.string().optional().describe('Category of the ticket.'),
    subCategory: z.string().optional().describe('Subcategory of the ticket.'),
    resolution: z.string().optional().describe('Resolution provided for the ticket.'),
    dueDate: z.string().optional().describe('Due date of the ticket in ISO 8601 format.'),
    priority: z.string().optional().describe('Priority of the ticket. Example: "High", "Medium", "Low"'),
    language: z.string().optional().describe('Language of the ticket.'),
    channel: z.string().optional().describe('Channel through which the ticket was created. Example: "Email", "Phone"'),
    classification: z.string().optional().describe('Classification of the ticket.'),
    customFields: z.record(z.string(), z.unknown()).optional().describe('Custom field values for the ticket.')
});

const ProviderTicketSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    modifiedTime: z.string().optional(),
    subCategory: z.string().nullable().optional(),
    statusType: z.string().optional(),
    subject: z.string().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    dueDate: z.string().nullable().optional(),
    departmentId: z.string().optional(),
    channel: z.string().optional(),
    description: z.string().nullable().optional(),
    resolution: z.string().nullable().optional(),
    closedTime: z.string().nullable().optional(),
    approvalCount: z.string().optional(),
    timeEntryCount: z.string().optional(),
    channelRelatedInfo: z.unknown().nullable().optional(),
    responseDueDate: z.string().nullable().optional(),
    isDeleted: z.boolean().optional(),
    createdTime: z.string().optional(),
    modifiedBy: z.string().optional(),
    isResponseOverdue: z.boolean().optional(),
    email: z.string().nullable().optional(),
    customerResponseTime: z.string().optional(),
    productId: z.string().nullable().optional(),
    contactId: z.string().optional(),
    threadCount: z.string().optional(),
    priority: z.string().nullable().optional(),
    classification: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    commentCount: z.string().optional(),
    taskCount: z.string().optional(),
    accountId: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    webUrl: z.string().optional(),
    teamId: z.string().nullable().optional(),
    attachmentCount: z.string().optional(),
    category: z.string().nullable().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    modifiedTime: z.string().optional(),
    subCategory: z.string().optional(),
    statusType: z.string().optional(),
    subject: z.string().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    dueDate: z.string().optional(),
    departmentId: z.string().optional(),
    channel: z.string().optional(),
    description: z.string().optional(),
    resolution: z.string().optional(),
    closedTime: z.string().optional(),
    approvalCount: z.string().optional(),
    timeEntryCount: z.string().optional(),
    channelRelatedInfo: z.unknown().optional(),
    responseDueDate: z.string().optional(),
    isDeleted: z.boolean().optional(),
    createdTime: z.string().optional(),
    modifiedBy: z.string().optional(),
    isResponseOverdue: z.boolean().optional(),
    email: z.string().optional(),
    customerResponseTime: z.string().optional(),
    productId: z.string().optional(),
    contactId: z.string().optional(),
    threadCount: z.string().optional(),
    priority: z.string().optional(),
    classification: z.string().optional(),
    assigneeId: z.string().optional(),
    commentCount: z.string().optional(),
    taskCount: z.string().optional(),
    accountId: z.string().optional(),
    phone: z.string().optional(),
    webUrl: z.string().optional(),
    teamId: z.string().optional(),
    attachmentCount: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Update a ticket.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-ticket',
        group: 'Tickets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const extension = connection.connection_config?.['extension'] || 'com';
        const baseUrlOverride = `https://desk.zoho.${extension}`;

        const data: Record<string, unknown> = {};

        if (input.subject !== undefined) {
            data['subject'] = input.subject;
        }
        if (input.departmentId !== undefined) {
            data['departmentId'] = input.departmentId;
        }
        if (input.contactId !== undefined) {
            data['contactId'] = input.contactId;
        }
        if (input.productId !== undefined) {
            data['productId'] = input.productId;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }
        if (input.assigneeId !== undefined) {
            data['assigneeId'] = input.assigneeId;
        }
        if (input.category !== undefined) {
            data['category'] = input.category;
        }
        if (input.subCategory !== undefined) {
            data['subCategory'] = input.subCategory;
        }
        if (input.resolution !== undefined) {
            data['resolution'] = input.resolution;
        }
        if (input.dueDate !== undefined) {
            data['dueDate'] = input.dueDate;
        }
        if (input.priority !== undefined) {
            data['priority'] = input.priority;
        }
        if (input.language !== undefined) {
            data['language'] = input.language;
        }
        if (input.channel !== undefined) {
            data['channel'] = input.channel;
        }
        if (input.classification !== undefined) {
            data['classification'] = input.classification;
        }
        if (input.customFields !== undefined) {
            data['customFields'] = input.customFields;
        }

        const response = await nango.patch({
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: `/api/v1/tickets/${encodeURIComponent(input.ticketId)}`,
            baseUrlOverride,
            data,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found or update failed.',
                ticketId: input.ticketId
            });
        }

        const providerTicket = ProviderTicketSchema.parse(response.data);

        return {
            id: providerTicket.id,
            ...(providerTicket.ticketNumber !== undefined && { ticketNumber: providerTicket.ticketNumber }),
            ...(providerTicket.modifiedTime !== undefined && { modifiedTime: providerTicket.modifiedTime }),
            ...(providerTicket.subCategory != null && { subCategory: providerTicket.subCategory }),
            ...(providerTicket.statusType !== undefined && { statusType: providerTicket.statusType }),
            ...(providerTicket.subject !== undefined && { subject: providerTicket.subject }),
            ...(providerTicket.customFields !== undefined && { customFields: providerTicket.customFields }),
            ...(providerTicket.dueDate != null && { dueDate: providerTicket.dueDate }),
            ...(providerTicket.departmentId !== undefined && { departmentId: providerTicket.departmentId }),
            ...(providerTicket.channel !== undefined && { channel: providerTicket.channel }),
            ...(providerTicket.description != null && { description: providerTicket.description }),
            ...(providerTicket.resolution != null && { resolution: providerTicket.resolution }),
            ...(providerTicket.closedTime != null && { closedTime: providerTicket.closedTime }),
            ...(providerTicket.approvalCount !== undefined && { approvalCount: providerTicket.approvalCount }),
            ...(providerTicket.timeEntryCount !== undefined && { timeEntryCount: providerTicket.timeEntryCount }),
            ...(providerTicket.channelRelatedInfo !== undefined && { channelRelatedInfo: providerTicket.channelRelatedInfo }),
            ...(providerTicket.responseDueDate != null && { responseDueDate: providerTicket.responseDueDate }),
            ...(providerTicket.isDeleted !== undefined && { isDeleted: providerTicket.isDeleted }),
            ...(providerTicket.createdTime !== undefined && { createdTime: providerTicket.createdTime }),
            ...(providerTicket.modifiedBy !== undefined && { modifiedBy: providerTicket.modifiedBy }),
            ...(providerTicket.isResponseOverdue !== undefined && { isResponseOverdue: providerTicket.isResponseOverdue }),
            ...(providerTicket.email != null && { email: providerTicket.email }),
            ...(providerTicket.customerResponseTime !== undefined && { customerResponseTime: providerTicket.customerResponseTime }),
            ...(providerTicket.productId != null && { productId: providerTicket.productId }),
            ...(providerTicket.contactId !== undefined && { contactId: providerTicket.contactId }),
            ...(providerTicket.threadCount !== undefined && { threadCount: providerTicket.threadCount }),
            ...(providerTicket.priority != null && { priority: providerTicket.priority }),
            ...(providerTicket.classification != null && { classification: providerTicket.classification }),
            ...(providerTicket.assigneeId != null && { assigneeId: providerTicket.assigneeId }),
            ...(providerTicket.commentCount !== undefined && { commentCount: providerTicket.commentCount }),
            ...(providerTicket.taskCount !== undefined && { taskCount: providerTicket.taskCount }),
            ...(providerTicket.accountId != null && { accountId: providerTicket.accountId }),
            ...(providerTicket.phone != null && { phone: providerTicket.phone }),
            ...(providerTicket.webUrl !== undefined && { webUrl: providerTicket.webUrl }),
            ...(providerTicket.teamId != null && { teamId: providerTicket.teamId }),
            ...(providerTicket.attachmentCount !== undefined && { attachmentCount: providerTicket.attachmentCount }),
            ...(providerTicket.category != null && { category: providerTicket.category }),
            ...(providerTicket.status !== undefined && { status: providerTicket.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
