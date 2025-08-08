import type { Stage } from '../models.js';
import type { UnanetStage } from '../types.js';

export function toStage(stage: UnanetStage): Stage {
    return {
        id: stage.StageID,
        name: stage.StageName,
        status: stage.StageType.StageTypeName
    };
}
