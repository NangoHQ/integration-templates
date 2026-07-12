import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-segments.js';

describe('pinterest update-customer-segments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-customer-segments',
        Model: 'ActionOutput_pinterest_updatecustomersegments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
