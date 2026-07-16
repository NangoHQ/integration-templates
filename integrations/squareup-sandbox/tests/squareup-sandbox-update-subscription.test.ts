import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-subscription.js';

describe('squareup-sandbox update-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-subscription',
        Model: 'ActionOutput_squareup_sandbox_updatesubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
