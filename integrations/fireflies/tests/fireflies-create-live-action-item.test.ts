import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-live-action-item.js';

describe('fireflies create-live-action-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-live-action-item',
        Model: 'ActionOutput_fireflies_createliveactionitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
