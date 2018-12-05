import createTraverser from './traverse';

const cleanNonConcurrentHeadCids = (headCids, headsAncestorsMap) =>
    headCids.filter((headCid) =>
        headCids.every((currHeadCid) =>
            currHeadCid === headCid ||
            !headsAncestorsMap.get(currHeadCid).has(headCid)
        )
    );

const createVersionCounter = () => {
    const versions = new Set();

    return {
        parse(entry) {
            if (entry.node.version != null) {
                versions.add(entry.node.version);
            }
        },
        get count() {
            return versions.size;
        },
    };
};

const resolveHeads = async (headCids, config, limit = Infinity) => {
    const traverse = createTraverser(config);

    let ancestorCid = null;
    const headsAncestorsMap = new Map(headCids.map((cid) => [cid, new Map()]));
    const mandatoryCids = new Set();
    const versionsCounter = createVersionCounter();

    const isCommonAncestor = (entry, stack) => (
        !mandatoryCids.size &&
        stack.every(({ cid }) => cid === entry.cid)
    );

    await traverse(headCids, (entry, stack) => {
        versionsCounter.parse(entry);

        // If this is a head, add its parents to the list of mandatory nodes to be visited
        if (entry.cid === entry.headCid) {
            entry.node.parents.forEach((cid) => mandatoryCids.add(cid));
        } else {
            // Associate this node's cid to the head it came from
            headsAncestorsMap.get(entry.headCid).set(entry.cid, true);

            // Unmark it from the mandatory nodes, if present
            mandatoryCids.delete(entry.cid);

            // Is it a common ancestor?
            if (isCommonAncestor(entry, stack)) {
                ancestorCid = entry.cid;

                return versionsCounter.count >= limit;
            }
        }
    });

    return {
        ancestorCid,
        headCids: cleanNonConcurrentHeadCids(headCids, headsAncestorsMap),
        versionsCount: versionsCounter.count,
    };
};

export default resolveHeads;
