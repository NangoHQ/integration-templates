import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-bounce.js';

describe('mailgun delete-bounce tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-bounce',
        Model: 'ActionOutput_mailgun_deletebounce'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
