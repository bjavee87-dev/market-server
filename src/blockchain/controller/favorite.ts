import {Favorite} from '../model/favorite'

export const FavoriteController = {
    create: async ({ collectionid, nftid, userid, userAddress, userEmail }: any) => {
        const newData = new Favorite({
            collectionid: collectionid,
            nftid: nftid,
            userAddress: userAddress,
            userEmail: userEmail
        });
        await newData.save();
        return true;
    },
    findOne: async (filter: any) => {
        return await Favorite.findOne(filter);
    },
    find: async (filter: any) => {
        return await Favorite.find(filter);
    },
    delete: async (filter: any) => {
        return await Favorite.deleteMany(filter);
    },
    update: async (filter: any, newData: any) => {
        return await Favorite.updateOne(
            filter,
            { $set: newData }
        );
    }
}
