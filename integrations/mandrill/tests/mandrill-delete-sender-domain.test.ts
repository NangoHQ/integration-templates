import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-sender-domain.js';

describe('mandrill delete-sender-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-sender-domain',
        Model: 'ActionOutput_mandrill_deletesenderdomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
