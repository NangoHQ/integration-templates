import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-whitelist-entries.js';

describe('mailgun list-whitelist-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-whitelist-entries',
        Model: 'ActionOutput_mailgun_listwhitelistentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
