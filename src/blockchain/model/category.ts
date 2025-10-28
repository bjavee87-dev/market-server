import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
	key: String,
	jp: String,
	en: String
})


export const Category = mongoose.model("Category", CategorySchema);
