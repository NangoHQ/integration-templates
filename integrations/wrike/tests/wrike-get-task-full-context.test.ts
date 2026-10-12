import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-task-full-context.js';

describe('wrike get-task-full-context tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-task-full-context',
        Model: 'ActionOutput_wrike_gettaskfullcontext'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
