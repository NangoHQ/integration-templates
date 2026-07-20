import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-change-request.js';

describe('servicenow update-change-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-change-request',
        Model: 'ActionOutput_servicenow_updatechangerequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
