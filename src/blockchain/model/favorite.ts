import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const FavoriteSchema = new Schema({
    collectionid: String,
    nftid: String,
    userEmail: String,
    userAddress: String
});

export const Favorite = mongoose.model("favoritenfts", FavoriteSchema);
