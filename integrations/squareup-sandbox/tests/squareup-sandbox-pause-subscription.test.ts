import { expect, it, describe } from 'vitest';

import createAction from '../actions/pause-subscription.js';

describe('squareup-sandbox pause-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'pause-subscription',
        Model: 'ActionOutput_squareup_sandbox_pausesubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
