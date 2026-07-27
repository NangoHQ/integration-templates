import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-timeoff-request.js';

describe('workable create-timeoff-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-timeoff-request',
        Model: 'ActionOutput_workable_createtimeoffrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
