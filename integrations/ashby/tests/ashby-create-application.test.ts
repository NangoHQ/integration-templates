import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-application.js';

describe('ashby create-application tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-application',
        Model: 'ActionOutput_ashby_createapplication'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
