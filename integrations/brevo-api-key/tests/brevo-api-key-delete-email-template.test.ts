import { expect, it, describe } from 'vitest';

import createAction from '../actions/delete-email-template.js';

describe('brevo-api-key delete-email-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-email-template',
        Model: 'ActionOutput_brevo_api_key_deleteemailtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
