import { expect, it, describe } from 'vitest';

import createAction from '../actions/get-subscription.js';

describe('squareup-sandbox get-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-subscription',
        Model: 'ActionOutput_squareup_sandbox_getsubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
