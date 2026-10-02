import { expect, it, describe } from 'vitest';

import createAction from '../actions/link-unlink-deal-relations.js';

describe('brevo-api-key link-unlink-deal-relations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-unlink-deal-relations',
        Model: 'ActionOutput_brevo_api_key_linkunlinkdealrelations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
