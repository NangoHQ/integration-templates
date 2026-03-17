import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-task.js';

describe('hubspot create-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-task',
        Model: 'ActionOutput_hubspot_createtask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
