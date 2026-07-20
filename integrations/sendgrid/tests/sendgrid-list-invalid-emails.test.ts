import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-invalid-emails.js';

describe('sendgrid list-invalid-emails tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-invalid-emails',
        Model: 'ActionOutput_sendgrid_listinvalidemails'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
