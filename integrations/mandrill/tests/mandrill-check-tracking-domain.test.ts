import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-tracking-domain.js';

describe('mandrill check-tracking-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-tracking-domain',
        Model: 'ActionOutput_mandrill_checktrackingdomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
