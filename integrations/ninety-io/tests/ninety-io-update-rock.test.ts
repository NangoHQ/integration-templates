import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-rock.js';

describe('ninety-io update-rock tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-rock',
        Model: 'ActionOutput_ninety_io_updaterock'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
