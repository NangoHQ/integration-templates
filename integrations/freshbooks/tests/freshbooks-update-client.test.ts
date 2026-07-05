import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-client.js';

describe('freshbooks update-client tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-client',
        Model: 'ActionOutput_freshbooks_updateclient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
