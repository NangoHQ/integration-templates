import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-task-dependency.js';

describe('wrike create-task-dependency tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-task-dependency',
        Model: 'ActionOutput_wrike_createtaskdependency'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
