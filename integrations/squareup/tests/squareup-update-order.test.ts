import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-order.js';

describe('squareup update-order tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-order',
        Model: 'ActionOutput_squareup_updateorder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
