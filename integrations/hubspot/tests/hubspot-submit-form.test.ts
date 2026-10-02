import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-form.js';

describe('hubspot submit-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-form',
        Model: 'ActionOutput_hubspot_submitform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
