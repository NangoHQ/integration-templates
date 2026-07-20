import { expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-subscription.js';

describe('squareup cancel-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-subscription',
        Model: 'ActionOutput_squareup_cancelsubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
