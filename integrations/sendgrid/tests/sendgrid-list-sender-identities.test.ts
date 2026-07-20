import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-sender-identities.js';

describe('sendgrid list-sender-identities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-sender-identities',
        Model: 'ActionOutput_sendgrid_listsenderidentities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
