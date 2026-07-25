import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-tracking-domain.js';

describe('mandrill delete-tracking-domain tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-tracking-domain',
        Model: 'ActionOutput_mandrill_deletetrackingdomain'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
