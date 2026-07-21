import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-inbound-domain.js';

describe('mandrill delete-inbound-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-inbound-domain',
        Model: 'ActionOutput_mandrill_deleteinbounddomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
