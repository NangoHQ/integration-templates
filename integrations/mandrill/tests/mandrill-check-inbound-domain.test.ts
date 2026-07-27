import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-inbound-domain.js';

describe('mandrill check-inbound-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-inbound-domain',
        Model: 'ActionOutput_mandrill_checkinbounddomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
