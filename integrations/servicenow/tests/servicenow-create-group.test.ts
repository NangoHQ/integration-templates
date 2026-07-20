import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-group.js';

describe('servicenow create-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-group',
        Model: 'ActionOutput_servicenow_creategroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
