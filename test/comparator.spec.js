import wrapComparator from '../src/comparator';

const numberComparator = wrapComparator((node1, node2) => node1.meta - node2.meta);

it('should return 0 if cids are the same', () => {
    expect(numberComparator({ cid: 1 }, { cid: 1 })).toBe(0);
});

it('should respect comparator result', () => {
    expect(numberComparator({ cid: 1, node: { meta: 1 } }, { cid: 2, node: { meta: 2 } })).toBe(1);
    expect(numberComparator({ cid: 1, node: { meta: 2 } }, { cid: 2, node: { meta: 1 } })).toBe(-1);
});

it('should fallback to comparing cids when comparator returns 0', () => {
    expect(numberComparator({ cid: 1, node: { meta: 1 } }, { cid: 2, node: { meta: 1 } })).toBe(1);
    expect(numberComparator({ cid: 2, node: { meta: 1 } }, { cid: 1, node: { meta: 1 } })).toBe(-1);
    expect(numberComparator({ cid: 1, node: { meta: 1 } }, { cid: 1, node: { meta: 1 } })).toBe(0);
});

it('should give priority to nodes without meta', () => {
    expect(numberComparator({ cid: 1, node: { meta: 1 } }, { cid: 2, node: {} })).toBe(-1);
    expect(numberComparator({ cid: 1, node: {} }, { cid: 2, node: { meta: 1 } })).toBe(1);
});

it('should fallback to comparing cids if both nodes have not meta', () => {
    expect(numberComparator({ cid: 1, node: {} }, { cid: 2, node: {} })).toBe(1);
    expect(numberComparator({ cid: 2, node: {} }, { cid: 1, node: {} })).toBe(-1);
});
