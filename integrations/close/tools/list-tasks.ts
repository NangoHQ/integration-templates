import { createHash } from 'node:crypto';
import { createTool } from 'nango';
import { z } from 'zod';

const InputDateValueSchema = z.union([
    z.iso.date().meta({ pattern: undefined }),
    z.iso.datetime({ offset: true }).meta({ pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' })
]);

const DateFilterSchema = z
    .object({
        eq: InputDateValueSchema.optional().describe('Exact calendar date or instant to match.'),
        gt: InputDateValueSchema.optional().describe('Exclusive lower date or instant bound.'),
        lt: InputDateValueSchema.optional().describe('Exclusive upper date or instant bound.'),
        gte: InputDateValueSchema.optional().describe('Inclusive lower date or instant bound.'),
        lte: InputDateValueSchema.optional().describe('Inclusive upper date or instant bound.')
    })
    .refine((value) => Object.keys(value).length >= 1, { message: 'Provide at least one date condition.' })
    .meta({ minProperties: 1 });

const InstantValueSchema = z.iso.datetime({ offset: true }).meta({ pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' });

const InstantFilterSchema = z
    .object({
        gt: InstantValueSchema.optional().describe('Exclusive lower instant with an explicit UTC marker or numeric offset.'),
        lt: InstantValueSchema.optional().describe('Exclusive upper instant with an explicit UTC marker or numeric offset.'),
        gte: InstantValueSchema.optional().describe('Inclusive lower instant with an explicit UTC marker or numeric offset.'),
        lte: InstantValueSchema.optional().describe('Inclusive upper instant with an explicit UTC marker or numeric offset.')
    })
    .refine((value) => Object.keys(value).length >= 1, { message: 'Provide at least one instant condition.' })
    .meta({ minProperties: 1 });

const InputSchema = z
    .object({
        date: DateFilterSchema.optional().describe("Conditions on the task's date; inbox and future override lt and gte."),
        view: z
            .enum(['inbox', 'future', 'archive'])
            .optional()
            .describe("Inbox includes incomplete tasks through the user's day, future includes later incomplete tasks, and archive includes complete tasks."),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum tasks in this page; defaults to 100.'),
        types: z
            .array(z.string().min(1))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Provider task type values to include, such as lead or outgoing_call; preserves other provider-defined types.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation from this tool; reuse only with the original filters, ordering, and limit.'),
        leadId: z.string().min(1).optional().describe('Opaque lead ID whose tasks to include.'),
        dueDate: DateFilterSchema.optional().describe("Conditions on the provider's separate due_date value."),
        orderBy: z
            .enum(['dateAscending', 'dateDescending', 'createdAtAscending', 'createdAtDescending'])
            .optional()
            .describe('Sort by task date or creation time, ascending or descending; omission uses provider ordering.'),
        taskIds: z
            .array(z.string().min(1))
            .min(1)
            .max(100)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Restrict results to these opaque task IDs; omission means no ID filter.'),
        createdAt: InstantFilterSchema.optional().describe('Conditions on task creation time.'),
        updatedAt: InstantFilterSchema.optional().describe('Conditions on task last-update time.'),
        assignedTo: z.string().min(1).optional().describe('Opaque Close user ID whose assigned tasks to include.'),
        isComplete: z.boolean().optional().describe('Include only tasks with this completion state; omit for either state.'),
        organizationId: z.string().min(1).optional().describe("Opaque organization ID to filter within the connection's authorized organizations.")
    })
    .describe('Filters, ordering, and pagination for listing one page of tasks.');

const OutputDateValueSchema = z.union([z.iso.date().meta({ pattern: undefined }), z.iso.datetime({ offset: true }).meta({ pattern: undefined })]).nullable();

const TaskSchema = z.object({
    id: z.string().describe('Opaque task identifier.'),
    date: OutputDateValueSchema.optional().describe(
        'Task date as a calendar date or UTC instant, preserving provider granularity; null when explicitly dateless.'
    ),
    text: z.string().nullable().optional().describe('Ordinary task text, preserving Unicode and empty text; null when explicitly absent.'),
    type: z.string().optional().describe('Provider task type, including types that cannot be created through this toolset.'),
    leadId: z.string().optional().describe('Opaque associated lead identifier.'),
    dueDate: OutputDateValueSchema.optional().describe('Separate provider due_date, preserving calendar-date or instant meaning; null when explicitly unset.'),
    priority: z.string().optional().describe('Provider task priority, such as high or medium; unknown future values are preserved.'),
    contactId: z.string().nullable().optional().describe('Associated contact identifier, null when explicitly unlinked; omitted if unavailable.'),
    createdAt: z.iso
        .datetime({ offset: true })
        .meta({ pattern: undefined })
        .optional()
        .describe('Creation instant normalized to UTC without precision loss; omitted if unavailable or only a calendar date is supplied.'),
    createdBy: z.string().optional().describe('Opaque identifier of the user credited with creating the task.'),
    updatedAt: z.iso
        .datetime({ offset: true })
        .meta({ pattern: undefined })
        .optional()
        .describe('Last-update instant normalized to UTC without precision loss; omitted if unavailable.'),
    assignedTo: z.string().nullable().optional().describe('Assigned Close user identifier, null when explicitly unassigned; omitted if unavailable.'),
    isComplete: z.boolean().optional().describe('Whether the task is complete.'),
    isDateless: z.boolean().optional().describe('Whether the provider marks the task as dateless.'),
    resolution: z.string().nullable().optional().describe('Provider resolution, such as abandoned or skipped; null when explicitly cleared.'),
    creationDate: z.iso
        .date()
        .meta({ pattern: undefined })
        .optional()
        .describe('Creation calendar date when date_created is date-only; mutually exclusive with createdAt.'),
    agentConfigId: z.string().nullable().optional().describe('Associated provider agent configuration identifier; null when explicitly unset.'),
    organizationId: z.string().optional().describe('Opaque organization identifier owning the task.')
});

const OutputSchema = z
    .object({
        items: z.array(TaskSchema).describe('Tasks in this provider page, in the requested or provider-default order.'),
        nextCursor: z.string().min(1).optional().describe('Opaque continuation for the next page; omitted when exhausted.')
    })
    .describe('One page of tasks with an opaque continuation cursor.');

const ProviderTaskSchema = z.object({
    id: z.string(),
    _type: z.string().optional(),
    text: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    contact_id: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    agent_config_id: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    is_complete: z.boolean().optional(),
    is_dateless: z.boolean().optional(),
    resolution: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional()
});

const ProviderTaskListSchema = z.object({
    data: z.array(ProviderTaskSchema),
    has_more: z.boolean().optional()
});

const ProviderErrorShapeSchema = z.looseObject({
    status: z.number().optional(),
    response: z
        .looseObject({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.looseObject({ error: z.string() });

const ConnectionInfoSchema = z.looseObject({ connection_id: z.string().optional() });

const ORDER_BY_PARAMS: Record<string, string> = {
    dateAscending: 'date',
    dateDescending: '-date',
    createdAtAscending: 'date_created',
    createdAtDescending: '-date_created'
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;
const CURSOR_PATTERN = /^lst1\.(\d+)\.([A-Za-z0-9_-]+)$/;

type DateConditions = {
    eq?: string | undefined;
    gt?: string | undefined;
    lt?: string | undefined;
    gte?: string | undefined;
    lte?: string | undefined;
};

function normalizeInstantToUtc(value: string): string | undefined {
    const match = INSTANT_PATTERN.exec(value);
    if (!match) {
        return undefined;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    const fraction = match[7];
    const zone = match[8];
    if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
        return undefined;
    }
    const unshifted = Date.UTC(year, month - 1, day, hour, minute, second);
    const check = new Date(unshifted);
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day ||
        check.getUTCHours() !== hour ||
        check.getUTCMinutes() !== minute ||
        check.getUTCSeconds() !== second
    ) {
        return undefined;
    }
    let utcMs = unshifted;
    if (zone !== 'Z') {
        const zoneMatch = /^([+-])(\d{2}):(\d{2})$/.exec(zone ?? '');
        if (!zoneMatch || Number(zoneMatch[2]) > 23 || Number(zoneMatch[3]) > 59) {
            return undefined;
        }
        const offsetMs = (Number(zoneMatch[2]) * 60 + Number(zoneMatch[3])) * 60000;
        utcMs = zoneMatch[1] === '+' ? unshifted - offsetMs : unshifted + offsetMs;
    }
    if (!Number.isFinite(utcMs)) {
        return undefined;
    }
    const shifted = new Date(utcMs).toISOString();
    return `${shifted.slice(0, 19)}${fraction ? `.${fraction}` : ''}Z`;
}

function normalizeFilterDateValue(value: string, field: string): string {
    if (DATE_ONLY_PATTERN.test(value)) {
        return value;
    }
    const utc = normalizeInstantToUtc(value);
    if (utc === undefined) {
        throw new Error(
            `date_not_representable: The ${field} value '${value}' cannot be represented exactly as a UTC instant. Use an instant with an explicit UTC marker or numeric offset, or a calendar date when that is the intended meaning.`
        );
    }
    return utc;
}

function dateConditionParams(prefix: string, filter: DateConditions, field: string): Record<string, string | number> {
    if (Object.keys(filter).length === 0) {
        throw new Error(`bad_request: The ${field} filter must contain at least one condition. Simplify the filters or choose a different view and try again.`);
    }
    const conditions: Record<string, string | number> = {};
    if (filter.eq !== undefined) {
        conditions[prefix] = normalizeFilterDateValue(filter.eq, field);
    }
    if (filter.gt !== undefined) {
        conditions[`${prefix}__gt`] = normalizeFilterDateValue(filter.gt, field);
    }
    if (filter.lt !== undefined) {
        conditions[`${prefix}__lt`] = normalizeFilterDateValue(filter.lt, field);
    }
    if (filter.gte !== undefined) {
        conditions[`${prefix}__gte`] = normalizeFilterDateValue(filter.gte, field);
    }
    if (filter.lte !== undefined) {
        conditions[`${prefix}__lte`] = normalizeFilterDateValue(filter.lte, field);
    }
    return conditions;
}

function joinFilterList(values: string[], field: string): string {
    for (const value of values) {
        if (value.includes(',')) {
            throw new Error(`bad_request: Each ${field} entry must be a single opaque value without a comma; pass each value as a separate array item.`);
        }
    }
    return values.join(',');
}

function cursorBinding(connectionId: string, params: Record<string, string | number>): string {
    const canonical = JSON.stringify(params, Object.keys(params).sort());
    return createHash('sha256').update(`${connectionId}\n${canonical}`).digest('base64url');
}

function encodeCursor(skip: number, binding: string): string {
    return `lst1.${skip}.${binding}`;
}

function decodeCursor(raw: string, expectedBinding: string): number {
    const match = CURSOR_PATTERN.exec(raw);
    if (!match) {
        throw new Error('invalid_cursor: The continuation is not a valid list-tasks cursor. Restart list-tasks without cursor using the desired filters.');
    }
    const skip = Number(match[1]);
    if (!Number.isSafeInteger(skip)) {
        throw new Error('invalid_cursor: The continuation does not encode a valid page offset. Restart list-tasks without cursor using the desired filters.');
    }
    if (match[2] !== expectedBinding) {
        throw new Error(
            'invalid_cursor: The continuation belongs to different filters, ordering, limit, or connection. Restart list-tasks without cursor using the desired filters.'
        );
    }
    return skip;
}

function mapProviderDateValue(value: string | null): string | null {
    if (value === null || DATE_ONLY_PATTERN.test(value)) {
        return value;
    }
    const utc = normalizeInstantToUtc(value);
    return utc === undefined ? value : utc;
}

function mapTask(task: z.infer<typeof ProviderTaskSchema>): z.infer<typeof TaskSchema> {
    const mapped: z.infer<typeof TaskSchema> = {
        id: task.id,
        ...(task.date !== undefined && { date: mapProviderDateValue(task.date) }),
        ...(task.text !== undefined && { text: task.text }),
        ...(task._type !== undefined && { type: task._type }),
        ...(task.lead_id !== undefined && task.lead_id !== null && { leadId: task.lead_id }),
        ...(task.due_date !== undefined && { dueDate: mapProviderDateValue(task.due_date) }),
        ...(task.priority !== undefined && task.priority !== null && { priority: task.priority }),
        ...(task.contact_id !== undefined && { contactId: task.contact_id }),
        ...(task.created_by !== undefined && task.created_by !== null && { createdBy: task.created_by }),
        ...(task.assigned_to !== undefined && { assignedTo: task.assigned_to }),
        ...(task.is_complete !== undefined && { isComplete: task.is_complete }),
        ...(task.is_dateless !== undefined && { isDateless: task.is_dateless }),
        ...(task.resolution !== undefined && { resolution: task.resolution }),
        ...(task.agent_config_id !== undefined && { agentConfigId: task.agent_config_id }),
        ...(task.organization_id !== undefined && task.organization_id !== null && { organizationId: task.organization_id })
    };
    if (task.date_created !== undefined && task.date_created !== null) {
        if (DATE_ONLY_PATTERN.test(task.date_created)) {
            mapped.creationDate = task.date_created;
        } else {
            const createdAt = normalizeInstantToUtc(task.date_created);
            if (createdAt !== undefined) {
                mapped.createdAt = createdAt;
            }
        }
    }
    if (task.date_updated !== undefined && task.date_updated !== null && !DATE_ONLY_PATTERN.test(task.date_updated)) {
        const updatedAt = normalizeInstantToUtc(task.date_updated);
        if (updatedAt !== undefined) {
            mapped.updatedAt = updatedAt;
        }
    }
    return mapped;
}

function toPublicError(error: unknown): Error {
    const parsed = ProviderErrorShapeSchema.safeParse(error);
    const status = parsed.success ? (parsed.data.status ?? parsed.data.response?.status) : undefined;
    let detail = '';
    if (parsed.success && parsed.data.response?.data !== undefined) {
        const body = ProviderErrorBodySchema.safeParse(parsed.data.response.data);
        if (body.success) {
            detail = ` ${body.data.error}`;
        }
    }
    if (status === 400) {
        return new Error(
            `bad_request: Close rejected the filter combination or requested view.${detail} Simplify the filters or choose a different view and try again.`
        );
    }
    if (status === 401 || status === 403) {
        return new Error(
            `access_denied: The connection's Close identity lacks authority to read the selected organization or tasks.${detail} Ask an authorized Close user for access or use an organization the connection can read.`
        );
    }
    if (status === 404) {
        return new Error(
            `not_found: Close reports that a referenced filtering resource is unavailable.${detail} Check the referenced lead, organization, or user identifier and retry with a valid reference.`
        );
    }
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * @tags: [read]
 * @tagReason: The tool performs a single read-only GET against the Close tasks collection and never mutates provider state.
 * @pitfalls: Inbox and future views use the Close user's timezone and override any date lt/gte bounds sent with them. Without a types filter, Close returns only lead-type tasks. Close deprecates due_date, so dueDate filters and values may be unreliable. Pages are not a stable snapshot: tasks created or completed between calls can shift results.
 */
const tool = createTool({
    name: 'list-tasks',
    description: 'List one page of tasks, optionally filtered by assignment, lead, task type, completion, task view, and dates.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use this to find task IDs and browse task views; use `get-task` for a known task. Pass nextCursor back as cursor with the same filters, ordering, and limit. Each call returns one page, with a default of 100 and a maximum of 100 tasks. Inbox and future views use the Close user's timezone and override the date less-than and greater-than-or-equal filters. Use the IDs returned here with `update-task`, `batch-update-tasks`, or `delete-task`.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const params: Record<string, string | number> = {
            _limit: input.limit ?? 100
        };
        if (input.assignedTo !== undefined) {
            params['assigned_to'] = input.assignedTo;
        }
        if (input.leadId !== undefined) {
            params['lead_id'] = input.leadId;
        }
        if (input.organizationId !== undefined) {
            params['organization_id'] = input.organizationId;
        }
        if (input.isComplete !== undefined) {
            params['is_complete'] = input.isComplete ? 'true' : 'false';
        }
        if (input.view !== undefined) {
            params['view'] = input.view;
        }
        if (input.types !== undefined) {
            params['_type__in'] = joinFilterList(input.types, 'types');
        }
        if (input.taskIds !== undefined) {
            params['id__in'] = joinFilterList(input.taskIds, 'taskIds');
        }
        if (input.orderBy !== undefined) {
            const orderBy = ORDER_BY_PARAMS[input.orderBy];
            if (orderBy !== undefined) {
                params['_order_by'] = orderBy;
            }
        }
        if (input.date !== undefined) {
            Object.assign(params, dateConditionParams('date', input.date, 'date'));
        }
        if (input.dueDate !== undefined) {
            Object.assign(params, dateConditionParams('due_date', input.dueDate, 'dueDate'));
        }
        if (input.createdAt !== undefined) {
            Object.assign(params, dateConditionParams('date_created', input.createdAt, 'createdAt'));
        }
        if (input.updatedAt !== undefined) {
            Object.assign(params, dateConditionParams('date_updated', input.updatedAt, 'updatedAt'));
        }

        const connection = await nango.getConnection();
        const connectionInfo = ConnectionInfoSchema.parse(connection);
        const binding = cursorBinding(connectionInfo.connection_id ?? '', params);

        let skip = 0;
        if (input.cursor !== undefined) {
            skip = decodeCursor(input.cursor, binding);
        }
        params['_skip'] = skip;

        let response: Awaited<ReturnType<typeof nango.get>>;
        // @allowTryCatch: Close HTTP error statuses are mapped to the public bad_request, access_denied, and not_found codes; any other failure is rethrown unchanged.
        try {
            // https://developer.close.com/openapi.json#GET%20/task/
            response = await nango.get({
                endpoint: '/v1/task/',
                params,
                retries: 3
            });
        } catch (error) {
            throw toPublicError(error);
        }

        const list = ProviderTaskListSchema.parse(response.data);
        const items = list.data.map(mapTask);
        const output: z.infer<typeof OutputSchema> = { items };
        if (list.has_more === true) {
            output.nextCursor = encodeCursor(skip + list.data.length, binding);
        }
        return output;
    }
});

export default tool;
