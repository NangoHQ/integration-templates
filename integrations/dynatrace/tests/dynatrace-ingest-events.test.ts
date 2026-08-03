import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/ingest-events.js';

describe('dynatrace ingest-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'ingest-events',
        Model: 'ActionOutput_dynatrace_ingestevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
