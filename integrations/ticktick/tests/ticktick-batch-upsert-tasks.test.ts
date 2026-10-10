import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-upsert-tasks.js';

describe('ticktick batch-upsert-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-upsert-tasks',
        Model: 'ActionOutput_ticktick_batchupserttasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
