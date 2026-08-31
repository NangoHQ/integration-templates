import { createAction, NangoAction } from 'nango';
import { z } from 'zod';

const CustomerChannelSchema = z.object({
    type: z.string(),
    address: z.string(),
    preferred: z.boolean().optional()
});

const CustomerSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    channels: z.array(CustomerChannelSchema).optional()
});

const CustomerListResponseSchema = z.object({
    data: z.array(CustomerSchema).optional(),
    meta: z
        .object({
            next_cursor: z.string().nullable().optional()
        })
        .optional()
});

const AccountSettingsListSchema = z.object({
    data: z
        .array(
            z.object({
                id: z.number(),
                type: z.string(),
                data: z
                    .object({
                        assignment_channels: z.array(z.string()).optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const TicketMessageSchema = z
    .object({
        id: z.number().describe('Unique identifier of the message.'),
        channel: z.string().nullable().optional().describe('The channel used for the message (e.g., email, phone, chat).'),
        body_text: z.string().nullable().optional().describe('The plain text body of the message.'),
        body_html: z.string().nullable().optional().describe('The HTML body of the message.')
    })
    .passthrough();

const TicketSchema = z
    .object({
        id: z.number().describe('Unique identifier of the ticket.'),
        channel: z.string().nullable().optional().describe('The channel through which the ticket was created (e.g., email, phone, chat).'),
        subject: z.string().nullable().optional().describe('The subject of the ticket.'),
        customer: z
            .object({
                id: z.number().describe('Unique identifier of the associated customer.')
            })
            .optional()
            .describe('The customer associated with the ticket.'),
        messages: z.array(TicketMessageSchema).optional().describe('List of messages on the ticket.'),
        created_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the ticket was created.'),
        updated_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the ticket was last updated.')
    })
    .passthrough()
    .describe('A Gorgias ticket created by the action.');

const InputSchema = z
    .object({
        subject: z.string().describe('Subject of the ticket to create.'),
        message: z.string().describe('Body of the first message on the ticket.'),
        email: z.string().optional().describe('Customer email address to use for lookup or creation.'),
        phone: z.string().optional().describe('Customer phone number to use for lookup or creation.'),
        name: z.string().describe('Full name of the customer to create if not found.'),
        from_agent: z.boolean().optional().describe('Whether the first message is from an agent. Defaults to false.')
    })
    .describe('Input for creating a Gorgias ticket, including customer details and the first message.');

async function checkSmsChannel(nango: NangoAction): Promise<'phone' | 'email'> {
    // https://developers.gorgias.com/reference/get-account
    const response = await nango.get({
        endpoint: '/api/account/settings',
        retries: 3
    });
    const list = AccountSettingsListSchema.safeParse(response.data);
    if (!list.success) {
        return 'email';
    }
    const ticketAssignment = list.data.data?.find((setting) => setting.type === 'ticket-assignment');
    const channels = ticketAssignment?.data?.assignment_channels || [];
    if (channels.includes('sms')) {
        return 'phone';
    }
    return 'email';
}

async function findCustomerByEmail(nango: NangoAction, email: string): Promise<number | null> {
    // https://developers.gorgias.com/reference/list-customers
    const response = await nango.get({
        endpoint: '/api/customers',
        params: {
            email: email,
            limit: 1
        },
        retries: 3
    });
    const list = CustomerListResponseSchema.safeParse(response.data);
    if (!list.success) {
        return null;
    }
    const customers = list.data.data || [];
    const firstCustomer = customers[0];
    if (firstCustomer && firstCustomer.id) {
        return firstCustomer.id;
    }
    return null;
}

async function findCustomerByChannel(nango: NangoAction, type: string, address: string): Promise<number | null> {
    // https://developers.gorgias.com/reference/list-customers
    for await (const page of nango.paginate({
        endpoint: '/api/customers',
        params: {
            limit: 100
        },
        retries: 3,
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'meta.next_cursor',
            cursor_name_in_request: 'cursor',
            response_path: 'data',
            limit_name_in_request: 'limit'
        }
    })) {
        const customers = z.array(CustomerSchema).safeParse(page);
        if (!customers.success) {
            continue;
        }
        for (const customer of customers.data) {
            if (!customer.id) {
                continue;
            }
            // https://developers.gorgias.com/reference/get-customer
            const detailResponse = await nango.get({
                endpoint: `/api/customers/${encodeURIComponent(customer.id)}`,
                retries: 3
            });
            const detail = CustomerSchema.safeParse(detailResponse.data);
            if (!detail.success) {
                continue;
            }
            const channels = detail.data.channels || [];
            for (const channel of channels) {
                if (channel.type === type && channel.address === address) {
                    return detail.data.id;
                }
            }
        }
    }
    return null;
}

async function createCustomer(nango: NangoAction, input: z.infer<typeof InputSchema>): Promise<number> {
    const channels: { type: string; address: string; preferred: boolean }[] = [];
    if (input.email) {
        channels.push({
            type: 'email',
            address: input.email,
            preferred: true
        });
    }
    if (input.phone) {
        channels.push({
            type: 'phone',
            address: input.phone,
            preferred: !input.email
        });
    }
    // https://developers.gorgias.com/reference/create-customer
    const response = await nango.post({
        endpoint: '/api/customers',
        data: {
            name: input.name,
            channels: channels
        },
        retries: 3
    });
    const customer = CustomerSchema.safeParse(response.data);
    if (!customer.success || !customer.data.id) {
        throw new nango.ActionError({
            message: 'Failed to create customer: invalid response'
        });
    }
    return customer.data.id;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads account settings to determine the ticket channel, searches for an existing customer, and creates a ticket (and a customer if necessary).
 * @pitfalls: The ticket channel is determined by account settings (phone when sms is enabled, otherwise email), but the first message is always created with channel 'phone' regardless, because the provider rejects email-channel messages that lack a full source envelope.
 */
const action = createAction({
    description: 'Create a ticket, finding or creating the customer by email/phone and choosing the phone vs. email message channel based on account settings.',
    version: '2.0.0',
    input: InputSchema,
    output: TicketSchema,
    scopes: ['tickets:write', 'customers:write', 'customers:read', 'account:read'],
    exec: async (nango, input) => {
        const ticketChannel = await checkSmsChannel(nango);
        let customerId: number | null = null;

        if (input.email) {
            customerId = await findCustomerByEmail(nango, input.email);
        }

        if (customerId === null && input.phone) {
            customerId = await findCustomerByChannel(nango, 'phone', input.phone);
        }

        if (customerId === null && input.email) {
            customerId = await findCustomerByChannel(nango, 'email', input.email);
        }

        if (customerId === null) {
            customerId = await createCustomer(nango, input);
        }

        const message = {
            channel: 'phone',
            body_text: input.message,
            from_agent: input.from_agent ?? false,
            sender: {
                id: customerId
            }
        };

        // https://developers.gorgias.com/reference/create-ticket
        const response = await nango.post({
            endpoint: '/api/tickets',
            data: {
                channel: ticketChannel,
                customer: {
                    id: customerId
                },
                from_agent: input.from_agent ?? false,
                messages: [message],
                subject: input.subject
            },
            retries: 3
        });

        const ticket = TicketSchema.safeParse(response.data);
        if (!ticket.success) {
            throw new nango.ActionError({
                message: 'Failed to create ticket: invalid response'
            });
        }

        return ticket.data;
    }
});

export default action;
