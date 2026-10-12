import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/complete-task-and-verify.js';

describe('ticktick complete-task-and-verify tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'complete-task-and-verify',
        Model: 'ActionOutput_ticktick_completetaskandverify'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
