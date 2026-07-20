import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-change-task.js';

describe('servicenow update-change-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-change-task',
        Model: 'ActionOutput_servicenow_updatechangetask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
