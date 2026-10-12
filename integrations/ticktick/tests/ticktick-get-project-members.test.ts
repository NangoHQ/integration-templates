import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-project-members.js';

describe('ticktick get-project-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-project-members',
        Model: 'ActionOutput_ticktick_getprojectmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
