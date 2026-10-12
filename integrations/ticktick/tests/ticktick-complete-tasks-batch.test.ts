import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/complete-tasks-batch.js';

describe('ticktick complete-tasks-batch tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'complete-tasks-batch',
        Model: 'ActionOutput_ticktick_completetasksbatch'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
