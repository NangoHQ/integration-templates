import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/count-unread-emails.js';

describe('instantly count-unread-emails tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'count-unread-emails',
        Model: 'ActionOutput_instantly_countunreademails'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
