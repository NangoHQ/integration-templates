import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-project-group.js';

describe('ticktick create-project-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-project-group',
        Model: 'ActionOutput_ticktick_createprojectgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
