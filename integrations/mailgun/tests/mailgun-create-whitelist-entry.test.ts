import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-whitelist-entry.js';

describe('mailgun create-whitelist-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-whitelist-entry',
        Model: 'ActionOutput_mailgun_createwhitelistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
