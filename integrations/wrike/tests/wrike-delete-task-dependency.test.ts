import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-task-dependency.js';

describe('wrike delete-task-dependency tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-task-dependency',
        Model: 'ActionOutput_wrike_deletetaskdependency'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
