import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-allowlist-entry.js';

describe('mandrill add-allowlist-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-allowlist-entry',
        Model: 'ActionOutput_mandrill_addallowlistentry'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
