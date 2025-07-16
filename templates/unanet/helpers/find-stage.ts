import { NangoAction } from "nango";
import type { Stage } from ../models.js;
import { toStage } from '../mappers/to-stage.js';

export async function findStage(nango: NangoAction, name: string): Promise<Stage | null> {
    const response = await nango.get({
        endpoint: `/api/opportunities/stage/search?q=StageName:"${name}"`,
        retries: 10
    });

    const { data } = response;

    if (data && data.length > 0) {
        return toStage(data[0]);
    }

    return null;
}
