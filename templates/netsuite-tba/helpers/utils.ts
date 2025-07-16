import { NangoSync } from "nango";
import type { NetsuiteMetadata } from ../models.js;

export async function formatDate(date: Date, nango: NangoSync): Promise<string> {
    const metadata = await nango.getMetadata<NetsuiteMetadata>();
    if (!metadata || !metadata.timezone) {
        await nango.log('Metadata not found, falling back to default timezone UTC');
    }
    const tz = metadata?.timezone || 'UTC';
    return date
        .toLocaleString('en-US', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: tz
        })
        .replace(',', '');
}
