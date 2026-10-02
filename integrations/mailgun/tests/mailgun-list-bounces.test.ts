import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-bounces.js';

describe('mailgun list-bounces tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-bounces',
        Model: 'ActionOutput_mailgun_listbounces'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
