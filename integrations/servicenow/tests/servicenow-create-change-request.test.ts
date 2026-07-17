import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-change-request.js';

describe('servicenow create-change-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-change-request',
        Model: 'ActionOutput_servicenow_createchangerequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
