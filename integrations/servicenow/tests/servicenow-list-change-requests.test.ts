import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-change-requests.js';

describe('servicenow list-change-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-change-requests',
        Model: 'ActionOutput_servicenow_listchangerequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
