import createInMemoryVersidag from './helpers/memory-versidag';
import resolveVersions from '../src/resolve-versions';

const mapResult = (result) => ({
    ...result,
    versions: result.versions.map(({ version }) => version),
});

it('should return an array of { version, meta }', async () => {
    const versidagA = await createInMemoryVersidag().add('A', 1);

    const result = await resolveVersions(
        versidagA.headCids,
        versidagA.config,
    );

    expect(result).toEqual({
        nextCids: [],
        versions: [{ version: 'A', meta: 1 }],
    });
});

it('should omit meta in merge nodes', async () => {
    const versidagA = await createInMemoryVersidag().add('A', 1);
    const versidagB = await versidagA.add('B', 2);
    const versidagC = await versidagA.add('C', 3);
    const versidagD = await versidagB.merge(versidagC.headCids, 'D');

    const result = await resolveVersions(
        versidagD.headCids,
        versidagA.config,
    );

    expect(result.versions[0]).not.toHaveProperty('meta');
    expect(result).toEqual({
        nextCids: [],
        versions: [
            { version: 'D' },
            { version: 'C', meta: 3 },
            { version: 'B', meta: 2 },
            { version: 'A', meta: 1 },
        ],
    });
});

describe('scenario 1', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.A.add('C', 3);
        versidags.D = await versidags.C.merge(versidags.B.headCids);
    });

    it('should return the correct result (heads: D)', async () => {
        const result = await resolveVersions(
            versidags.D.headCids,
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: B, C)', async () => {
        const result = await resolveVersions(
            [...versidags.B.headCids, ...versidags.C.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: B, D)', async () => {
        const result = await resolveVersions(
            [...versidags.B.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: D, C)', async () => {
        const result = await resolveVersions(
            [...versidags.D.headCids, ...versidags.C.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: A, D)', async () => {
        const result = await resolveVersions(
            [...versidags.A.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['C', 'B', 'A'],
        });
    });

    it('should return the first 2 versions and the next 1 afterwards', async () => {
        const firstResult = await resolveVersions(
            versidags.D.headCids,
            versidags.A.config,
            2,
        );
        const secondResult = await resolveVersions(
            firstResult.nextCids,
            versidags.A.config,
            2,
        );

        expect(mapResult(firstResult)).toEqual({
            nextCids: versidags.A.headCids,
            versions: ['C', 'B'],
        });
        expect(mapResult(secondResult)).toEqual({
            nextCids: [],
            versions: ['A'],
        });
    });

    it('should return the each version 1 by 1', async () => {
        let nextCids = versidags.D.headCids;
        const results = [];

        while (nextCids.length) {
            // eslint-disable-next-line no-await-in-loop
            const result = await resolveVersions(
                nextCids,
                versidags.A.config,
                1,
            );

            nextCids = result.nextCids;
            results.push(result);
        }

        const mappedResults = results.map(mapResult);

        expect(mappedResults).toEqual([
            {
                nextCids: [
                    ...versidags.B.headCids,
                    ...versidags.A.headCids,
                ],
                versions: ['C'],
            },
            {
                nextCids: versidags.A.headCids,
                versions: ['B'],
            },
            {
                nextCids: [],
                versions: ['A'],
            },
        ]);
    });
});

describe('scenario 2', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.A.add('C', 3);
        versidags.D = await versidags.C.merge(versidags.B.headCids);
        versidags.E = await versidags.A.add('E', 5);
        versidags.F = await versidags.D.merge(versidags.E.headCids);
    });

    it('should return the correct result (heads: F)', async () => {
        const result = await resolveVersions(
            versidags.F.headCids,
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['E', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: E, D)', async () => {
        const result = await resolveVersions(
            [...versidags.E.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['E', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: F, E)', async () => {
        const result = await resolveVersions(
            [...versidags.F.headCids, ...versidags.E.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['E', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (D, F)', async () => {
        const result = await resolveVersions(
            [...versidags.D.headCids, ...versidags.F.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['E', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (A, F)', async () => {
        const result = await resolveVersions(
            [...versidags.A.headCids, ...versidags.F.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['E', 'C', 'B', 'A'],
        });
    });

    it('should return the first 2 versions and the next 2 afterwards', async () => {
        const firstResult = await resolveVersions(
            versidags.F.headCids,
            versidags.A.config,
            2,
        );
        const secondResult = await resolveVersions(
            firstResult.nextCids,
            versidags.A.config,
            2,
        );

        expect(mapResult(firstResult)).toEqual({
            nextCids: [...versidags.B.headCids, ...versidags.A.headCids],
            versions: ['E', 'C'],
        });
        expect(mapResult(secondResult)).toEqual({
            nextCids: [],
            versions: ['B', 'A'],
        });
    });

    it('should return the first 3 versions and the next 1 afterwards', async () => {
        const firstResult = await resolveVersions(
            versidags.F.headCids,
            versidags.A.config,
            3,
        );
        const secondResult = await resolveVersions(
            firstResult.nextCids,
            versidags.A.config,
            1,
        );

        expect(mapResult(firstResult)).toEqual({
            nextCids: versidags.A.headCids,
            versions: ['E', 'C', 'B'],
        });
        expect(mapResult(secondResult)).toEqual({
            nextCids: [],
            versions: ['A'],
        });
    });

    it('should return the each version 1 by 1', async () => {
        let nextCids = versidags.F.headCids;
        const results = [];

        while (nextCids.length) {
            // eslint-disable-next-line no-await-in-loop
            const result = await resolveVersions(
                nextCids,
                versidags.A.config,
                1,
            );

            nextCids = result.nextCids;
            results.push(result);
        }

        const mappedResults = results.map(mapResult);

        expect(mappedResults).toEqual([
            {
                nextCids: [
                    ...versidags.C.headCids,
                    ...versidags.B.headCids,
                    ...versidags.A.headCids,
                ],
                versions: ['E'],
            },
            {
                nextCids: [
                    ...versidags.B.headCids,
                    ...versidags.A.headCids,
                ],
                versions: ['C'],
            },
            {
                nextCids: versidags.A.headCids,
                versions: ['B'],
            },
            {
                nextCids: [],
                versions: ['A'],
            },
        ]);
    });
});

describe('scenario 3', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.B.add('C', 3);
        versidags.D = await versidags.B.add('D', 4);
        versidags.E = await versidags.C.merge(versidags.D.headCids);
    });

    it('should return the correct result (heads: E)', async () => {
        const result = await resolveVersions(
            versidags.E.headCids,
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['D', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: C, D)', async () => {
        const result = await resolveVersions(
            [...versidags.C.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['D', 'C', 'B', 'A'],
        });
    });
});

describe('scenario 4', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 5);
        versidags.B = await versidags.A.add('B', 6);
        versidags.C = await versidags.B.add('C', 2);
        versidags.D = await versidags.B.add('D', 3);
        versidags.E = await versidags.D.merge(versidags.C.headCids);
        versidags.F = await versidags.B.add('F', 5);
        versidags.G = await versidags.E.merge([...versidags.B.headCids, ...versidags.F.headCids]);
    });

    it('should return the correct result (heads: G)', async () => {
        const result = await resolveVersions(
            versidags.G.headCids,
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['F', 'D', 'C', 'B', 'A'],
        });
    });

    it('should return the correct result (heads: B, G)', async () => {
        const result = await resolveVersions(
            [...versidags.B.headCids, ...versidags.G.headCids],
            versidags.A.config,
        );

        expect(mapResult(result)).toEqual({
            nextCids: [],
            versions: ['F', 'D', 'C', 'B', 'A'],
        });
    });

    it('should return the first 3 versions and the next 2 afterwards', async () => {
        const firstResult = await resolveVersions(
            versidags.G.headCids,
            versidags.A.config,
            3,
        );
        const secondResult = await resolveVersions(
            firstResult.nextCids,
            versidags.A.config,
            3,
        );

        expect(mapResult(firstResult)).toEqual({
            nextCids: versidags.B.headCids,
            versions: ['F', 'D', 'C'],
        });
        expect(mapResult(secondResult)).toEqual({
            nextCids: [],
            versions: ['B', 'A'],
        });
    });
});
