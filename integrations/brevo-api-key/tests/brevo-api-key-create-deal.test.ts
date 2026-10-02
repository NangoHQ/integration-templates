import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-deal.js';

describe('brevo-api-key create-deal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-deal',
        Model: 'ActionOutput_brevo_api_key_createdeal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
