export function mapPropertiesToNotionFormat(schema: Record<string, { type: string }>, userInput: Record<string, any>): Record<string, any> {
    const dbRow: Record<string, any> = {};

    for (const [key, value] of Object.entries(userInput)) {
        const notionType = schema[key]?.type;

        if (notionType === 'title' && typeof value === 'string') {
            dbRow[key] = { title: [{ text: { content: value } }] };
        } else if (notionType === 'select' && typeof value === 'string') {
            dbRow[key] = { select: { name: value } };
        } else if (notionType === 'multi_select' && Array.isArray(value)) {
            dbRow[key] = { multi_select: value.map((v) => ({ name: v })) };
        } else if (notionType === 'status' && typeof value === 'string') {
            dbRow[key] = { status: { name: value } };
        } else if (notionType === 'date') {
            if (typeof value === 'string') {
                dbRow[key] = { date: { start: value } };
            } else if (value?.start) {
                dbRow[key] = { date: value };
            }
        } else if (notionType === 'checkbox' && typeof value === 'boolean') {
            dbRow[key] = { checkbox: value };
        } else if (notionType === 'number' && typeof value === 'number') {
            dbRow[key] = { number: value };
        } else if (notionType === 'url' && typeof value === 'string') {
            dbRow[key] = { url: value };
        } else if (notionType === 'email' && typeof value === 'string') {
            dbRow[key] = { email: value };
        } else if (notionType === 'phone_number' && typeof value === 'string') {
            dbRow[key] = { phone_number: value };
        } else if (notionType === 'rich_text' && typeof value === 'string') {
            dbRow[key] = { rich_text: [{ text: { content: value } }] };
        } else if (notionType === 'relation' && Array.isArray(value)) {
            dbRow[key] = { relation: value.map((id) => ({ id })) };
        } else {
            // Unmapped
        }
    }

    return dbRow;
}
