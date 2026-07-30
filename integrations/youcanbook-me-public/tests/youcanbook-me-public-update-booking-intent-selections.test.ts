import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-booking-intent-selections.js';

describe('youcanbook-me-public update-booking-intent-selections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-booking-intent-selections',
        Model: 'ActionOutput_youcanbook_me_public_updatebookingintentselections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
