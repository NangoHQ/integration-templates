import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-change-task.js';

describe('servicenow get-change-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-change-task',
        Model: 'ActionOutput_servicenow_getchangetask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
