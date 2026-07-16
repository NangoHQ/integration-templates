import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-template-version.js';

describe('sendgrid delete-template-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-template-version',
        Model: 'ActionOutput_sendgrid_deletetemplateversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
