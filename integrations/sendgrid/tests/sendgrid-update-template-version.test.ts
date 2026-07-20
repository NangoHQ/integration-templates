import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-template-version.js';

describe('sendgrid update-template-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-template-version',
        Model: 'ActionOutput_sendgrid_updatetemplateversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
