import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-whitelist-entry.js';

describe('mailgun delete-whitelist-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-whitelist-entry',
        Model: 'ActionOutput_mailgun_deletewhitelistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
