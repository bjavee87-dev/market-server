import { BLOCKNUM } from '../model/blocknum'

export const BlockNumController = {
    create: async ({ id, latestBlock }: any) => {
        const updateData = { id, latestBlock };
		var oldData = await BLOCKNUM.findOne({id: id})
		if (!oldData) {
            const newData = new BLOCKNUM({
                id: id,
                latestBlock: latestBlock,
            });
			await newData.save();
			return true;
		} else {
			await BLOCKNUM.updateOne(
				{ id: id},
				{ $set: updateData }
			);
			return false;
		}
    },
    findOne: async ({ id }: any) => {
        return await BLOCKNUM.findOne({ id: id });
    },
    find: async ({ id }: any) => {
        return await BLOCKNUM.find({ id: id });
    },
    update: async (filter: any, newData: any) => {
        return await BLOCKNUM.updateOne(
            filter,
            { $set: newData }
        );
    },
    removeAll: async () => {
        return await BLOCKNUM.remove();
    }
}
