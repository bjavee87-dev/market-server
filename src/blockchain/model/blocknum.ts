import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const BLOCKNUMSchema = new Schema({
    id: String,
    latestBlock: Number
});

export const BLOCKNUM = mongoose.model("blocknumes", BLOCKNUMSchema);
