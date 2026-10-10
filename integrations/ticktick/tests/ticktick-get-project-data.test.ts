import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-project-data.js';

describe('ticktick get-project-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-project-data',
        Model: 'ActionOutput_ticktick_getprojectdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
