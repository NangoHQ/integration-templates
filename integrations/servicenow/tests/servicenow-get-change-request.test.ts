import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-change-request.js';

describe('servicenow get-change-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-change-request',
        Model: 'ActionOutput_servicenow_getchangerequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
