import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-template-version.js';

describe('sendgrid activate-template-version tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-template-version',
        Model: 'ActionOutput_sendgrid_activatetemplateversion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
