import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-client.js';

describe('freshbooks delete-client tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-client',
        Model: 'ActionOutput_freshbooks_deleteclient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
