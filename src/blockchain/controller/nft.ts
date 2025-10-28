
import { ActivitiesController } from "./";
import { FavoriteController } from "./favorite";
import { CollectionsController } from "./collection";
import PaylableTokensController from "./paylabletokens";
import { UserController } from "../../user/controller";
import { NFTItems, NFTMetaDatas, NFTMarketDatas, Activities, Collections } from "../model"
import Config from "../../../config.json"
import { addToIpfs, resizeFile } from "../../utils";
import { encodeByte32String, toChecksumAddress } from "../../utils/blockchain";


const NFTSearchController = {
  searchActivity: async (data) => {
    const nftcollection = data?.nftcollection || "";
    const nftid = data?.nftid;
    let type = (data?.type || "").split(",");
    const acts = await ActivitiesController.find({
      nftCollection: nftcollection,
      tokenid: nftid,
      type: { "$in": type }
    })
    return acts
  },
  search: async (data: NFTSearch) => {
    const query = data?.query || "";
    const tokenid = data?.tokenid || "";
    let price1 = data?.price1;
    let price2 = data?.price2;
    let owner = data?.owner || "";
    let creator = data?.creator || "";
    const searchsymbol = data?.searchsymbol;
    if (price1 === 0) price1 = -1;
    if (price2 === 0) price2 = 2147483647;
    let salestatus = (data?.salestatus || "").split(",");
    let symbols = (data?.symbols || "").split(",");
    const page = data?.page || 1;
    const limit = data?.limit || 30;
    const sort = data?.sort;

    if (symbols.length === 1 && symbols[0] === '') {
      const tokens = await PaylableTokensController.find({})
      symbols = []
      tokens.forEach(token => {
        symbols.push(token.symbol)
      })
    }
    if (salestatus.length === 1 && salestatus[0] === "") salestatus = ["auction", "regular", ""];
    salestatus.forEach((v, index) => {
      if (v === "nosale") salestatus[index] = ""
    });
    let nftcollection = data?.nftcollection?.toString();
    if (nftcollection && nftcollection.length !== 42) {
      const searchCollection = await CollectionsController.find({ url: nftcollection });
      if (!searchCollection || searchCollection.length === 0) return []
      nftcollection = searchCollection[0]?.address;
    }
    if (nftcollection?.length === 42) nftcollection = toChecksumAddress(nftcollection.toString())
    let sortid: "_id" | "price" | "expiredTime" = "price";
    let sorttype = 1 as 1 | -1;
    switch (sort) {
      case "latest": { sortid = "_id"; sorttype = -1; break; }
      case "oldest": { sortid = "_id"; sorttype = 1; break; }
      case "recent": { sortid = "expiredTime"; sorttype = -1; break; }
      case "sales": { sortid = "expiredTime"; sorttype = 1; break; }
      case "descend": { sortid = "price"; sorttype = -1; break; }
      case "lowest": { sortid = "price"; sorttype = 1; break; }
    }
    var sortOperator = { "$sort": {} };
    sortOperator["$sort"][sortid] = sorttype;
    var tokenIdHas = { "id": tokenid };
    var tokenIdEmpty = {
      'id': { "$regex": tokenid, "$options": "i" }
    };

    const result = await NFTMetaDatas.aggregate([
      {
        $lookup: {
          from: "nftitems",
          let: {
            nftCollection: "$nftCollection",
            id: "$id",
          },
          pipeline: [{
            $match: {
              $expr: {
                $and: [{
                  $eq: ["$nftCollection", "$$nftCollection"]
                }, {
                  $eq: ["$id", "$$id"]
                }]
              }
            }
          }],
          as: "items",

        }
      }, {
        $lookup: {
          from: "nftmarketdatas",
          let: {
            nftCollection: "$nftCollection",
            id: "$id"
          },
          pipeline: [{
            $match: {
              $expr: {
                $and: [{
                  $eq: ["$nftCollection", "$$nftCollection"]
                }, {
                  $eq: ["$id", "$$id"]
                }]
              }
            }
          }],
          as: "marketdatas"
        }
      }, {
        $lookup: {
          from: "nftorderbooks",
          let: {
            nftCollection: "$nftCollection",
            id: "$id",
          },
          pipeline: [{
            $match: {
              $expr: {
                $and: [{
                  $eq: ["$nftCollection", "$$nftCollection"]
                }, {
                  $eq: ["$id", "$$id"]
                }]
              }
            }
          }],
          as: "orderbooks"
        }
      }, {
        $lookup: {
          from: "collections",
          localField: "nftCollection",
          foreignField: "address",
          as: "collections"
        }
      }, {
        $unwind: '$collections'
      }, {
        $unwind: '$marketdatas'
      }, {
        $unwind: '$items'
      }, {
        $unwind: '$orderbooks'
      }, {
        $addFields: {
          "tokenid": "$items.id",
          "owner": "$items.owner",
          "creator": "$items.creator",
          'price': "$marketdatas.price",
          'pick': "$items.pick",
          'hide': "$items.hide",
          'acceptedToken': "$marketdatas.acceptedToken",
          'expiredTime': "$marketdatas.expiredTime",
          'bidders': "$orderbooks.bidders",
          'startTime': "$orderbooks.startTime",
          'endTime': "$orderbooks.endTime",
          'saleType': "$marketdatas.saleType",
          'isDigital': "$marketdatas.isDigital",
          'isCopyright': "$marketdatas.isCopyright",
          'isRight': "$marketdatas.isRight",
          'collectionname': "$collections.metadata.name",
          'collectionverified': "$collections.verified.status",
        },
      }, {
        $match: {
          $and: [
            { collectionname: { $regex: query, $options: 'i' } },
            { acceptedToken: { $in: symbols } },
            { acceptedToken: { $regex: searchsymbol, $options: 'i' } },
            { owner: { $regex: owner, $options: 'i' } },
            { creator: { $regex: creator, $options: 'i' } },
            { nftCollection: { $regex: nftcollection, $options: 'i' } },
            tokenid ? tokenIdHas : tokenIdEmpty,
            { saleType: { $in: salestatus } },
            { price: { $gt: Number(price1) } },
            { price: { $lt: Number(price2) } },
          ]
        }
      },
      // sortOperator
    ]).skip((Number(page) - 1) * Number(limit)).limit(Number(limit) * 1).exec();;

    return result;
  },
  setViews: async (collection: string, nftId: string) => {
    const metadata = await NFTMetaDatasController.findOne({
      nftCollection: collection,
      id: nftId
    })
    const views = metadata?.views || 0;
    if (collection.length === 42 && nftId) {
      await NFTMetaDatasController.update({
        nftCollection: collection,
        id: nftId
      }, {
        views: views + 1
      })
    }
    return true;
  },
  getMainNfts: async () => {
    try {
      let values = await NFTMetaDatas.aggregate([
        {
          $sort: { favs: -1 }
        }, {
          $lookup: {
            from: "nftitems",
            let: {
              nftCollection: "$nftCollection",
              id: "$id",
            },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$nftCollection", "$$nftCollection"] },
                    { $eq: ["$id", "$$id"] },
                    { $eq: ["$hide", false] }
                  ]
                }
              }
            }],
            as: "items"
          }
        }, {
          $lookup: {
            from: "nftmarketdatas",
            let: {
              nftCollection: "$nftCollection",
              id: "$id"
            },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$nftCollection", "$$nftCollection"] },
                    { $eq: ["$id", "$$id"] }
                  ]
                }
              }
            }],
            as: "marketdatas"
          }
        }, {
          $lookup: {
            from: "nftorderbooks",
            let: {
              nftCollection: "$nftCollection",
              id: "$id",
            },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$nftCollection", "$$nftCollection"] },
                    { $eq: ["$id", "$$id"] }
                  ]
                }
              }
            }],
            as: "orderbooks"
          }
        }, {
          $lookup: {
            from: "collections",
            localField: "nftCollection",
            foreignField: "address",
            as: "collections"
          }
        }, {
          $unwind: '$collections'
        }, {
          $unwind: '$marketdatas'
        }, {
          $unwind: '$items'
        }, {
          $unwind: '$orderbooks'
        }, {
          $project: {
            id: 1,
            favs: 1,
            name: 1,
            error: 1,
            views: 1,
            image: 1,
            reacts: 1,
            metaHash: 1,
            coverImage: 1,
            attributes: 1,
            description: 1,
            externalSite: 1,
            nftCollection: 1,
            updatedBlockNum: 1,

            tokenid: "$items.id",
            owner: "$items.owner",
            creator: "$items.creator",
            price: "$marketdatas.price",
            pick: "$items.pick",
            hide: "$items.hide",
            acceptedToken: "$marketdatas.acceptedToken",
            expiredTime: "$marketdatas.expiredTime",
            bidders: "$orderbooks.bidders",
            saleType: "$marketdatas.saleType",
            isDigital: "$marketdatas.isDigital",
            isCopyright: "$marketdatas.isCopyright",
            isRight: "$marketdatas.isRight",
            collectionname: "$collections.metadata.name",
            collectionverified: "$collections.verified.status",
          },
        }, {
          $limit: 10
        }
      ]).exec();

      values = values.map((v) => {
        if (!v.name) v.name = v.collectionname + v.tokenid
        return v
      })

      return values
    } catch (err) {
      console.log(err.message)
      return []
    }
  },
  getTopCreator: async () => {
    try {
      const collections = await Collections.aggregate([
        {
          $lookup: {
            from: "collectiondatas",
            let: { "address": "$address" },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$address", "$$address"] }
                  ]
                }
              }
            }],
            as: "datas"
          }
        }, {
          $unwind: '$datas'
        }, {
          $addFields: {
            items: "$datas.items",
            volume: "$datas.volume",
            volumeJpy: "$datas.volumeJpy",
          }
        }, {
          $group: {
            _id: '$owner',
            items: { $sum: "$items" },
            volume: { $sum: "$volume" },
            volumeJpy: { $sum: "$volumeJpy" },
          }
        }, {
          $sort: {
            volume: -1,
            items: -1
          }
        }
      ]).skip(0).limit(10).exec();

      let arr = []
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        let creatorInfo = await UserController.find({
          filter: {
            address: collection._id
          }
        }) as any;
        creatorInfo = creatorInfo?.[0];
        if (creatorInfo && creatorInfo?.allow?.status === true) {
          if (!arr.find(v => v.address == creatorInfo?.address)) {
            arr.push({
              address: creatorInfo?.address,
              name: creatorInfo?.name,
              email: creatorInfo?.email,
              phone: creatorInfo?.phone,
              banner_img: creatorInfo?.banner_img,
              avatar_img: creatorInfo?.avatar_img,
              verified: creatorInfo?.verified?.status,
              items: collection.items,
              volume: collection.volume,
              volumeJpy: collection.volumeJpy
            })
          }
        }
      };
      return arr
    } catch (err) {
      console.log(err)
      return []
    }
  },
  getTopSellNFT: async () => {
    try {
      const sellNfts = await Activities.find({
        type: "Sell"
      }).sort({ created: -1 }).skip(0).limit(20).exec();
      const list = [];
      sellNfts.forEach(element => {
        if (!list.find(v => v.collection == element?.nftCollection && v.nft == element.tokenid)) {
          list.push({ collection: element.nftCollection, nft: element.tokenid })
        }
      });
      let result = []
      for (let i = 0; i < list.length; i++) {
        const collection = list[i].collection;
        const nftid = list[i].nft;
        const values = await NFTMetaDatas.aggregate([
          {
            $lookup: {
              from: "nftitems",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",
              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        },
                        {
                          "$eq": ["$hide", false]
                        },
                      ]
                    }
                  }
                }
              ],
              as: "items"
            }
          },
          {
            $lookup: {
              from: "nftmarketdatas",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",

              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        }
                      ]
                    }
                  }
                }
              ],
              as: "marketdatas"
            }
          },
          {
            $lookup: {
              from: "nftorderbooks",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",
              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        }
                      ]
                    }
                  }
                }
              ],
              as: "orderbooks"
            }
          },
          {
            $lookup: {
              from: "collections",
              localField: "nftCollection",
              foreignField: "address",
              as: "collections"
            }
          },
          {
            $unwind: '$collections'
          },
          {
            $unwind: '$marketdatas'
          },
          {
            $unwind: '$items'
          },
          {
            $unwind: '$orderbooks'
          },
          {
            $addFields: {
              "tokenid": "$items.id",
              "owner": "$items.owner",
              "creator": "$items.creator",
              'price': "$marketdatas.price",
              'pick': "$items.pick",
              'hide': "$items.hide",
              'acceptedToken': "$marketdatas.acceptedToken",
              'expiredTime': "$marketdatas.expiredTime",
              'bidders': "$orderbooks.bidders",
              'saleType': "$marketdatas.saleType",
              'isDigital': "$marketdatas.isDigital",
              'isCopyright': "$marketdatas.isCopyright",
              'isRight': "$marketdatas.isRight",
              'collectionname': "$collections.metadata.name",
              'collectionverified': "$collections.verified.status",
            },
          },
          {
            "$match": {
              "$and": [
                { 'nftCollection': { "$regex": collection, "$options": "i" } },
                { 'tokenid': { "$regex": nftid, "$options": "i" } }
              ]
            }
          }
        ])
        result.push(...values)
      }
      return result
    } catch (err) {
      console.log(err)
      return []
    }
  },
  favoriteList: async (data: NFTSearch) => {
    let owner = data?.owner;
    const nftlist = await FavoriteController.find({
      userAddress: owner
    });
    if (nftlist?.length > 0) {
      let result = [];
      for (let i = 0; i < nftlist.length; i++) {
        const element = nftlist[i];
        const collectionid = element.collectionid
        const nftid = element.nftid;
        const values = await NFTMetaDatas.aggregate([
          {
            $lookup: {
              from: "nftitems",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",
              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        },

                      ]
                    },

                  },

                }
              ],
              as: "items",

            }
          },
          {
            $lookup: {
              from: "nftmarketdatas",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",

              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        }
                      ]
                    },

                  },

                }
              ],
              as: "marketdatas"
            }
          },
          {
            $lookup: {
              from: "nftorderbooks",
              let: {
                "nftCollection": "$nftCollection",
                "id": "$id",
              },
              "pipeline": [
                {
                  "$match":
                  {
                    "$expr":
                    {
                      "$and": [
                        {
                          "$eq": ["$nftCollection", "$$nftCollection"]
                        },
                        {
                          "$eq": ["$id", "$$id"]
                        }
                      ]
                    },

                  },
                }
              ],
              as: "orderbooks"
            }
          },
          {
            $lookup: {
              from: "collections",
              localField: "nftCollection",
              foreignField: "address",
              as: "collections"
            }
          },
          {
            $unwind: '$collections'
          },
          {
            $unwind: '$marketdatas'
          },
          {
            $unwind: '$items'
          },
          {
            $unwind: '$orderbooks'
          },
          {
            $addFields: {
              "tokenid": "$items.id",
              "owner": "$items.owner",
              "creator": "$items.creator",
              'price': "$marketdatas.price",
              'pick': "$items.pick",
              'hide': "$items.hide",
              'acceptedToken': "$marketdatas.acceptedToken",
              'expiredTime': "$marketdatas.expiredTime",
              'bidders': "$orderbooks.bidders",
              'saleType': "$marketdatas.saleType",
              'isDigital': "$marketdatas.isDigital",
              'isCopyright': "$marketdatas.isCopyright",
              'isRight': "$marketdatas.isRight",
              'collectionname': "$collections.metadata.name",
              'collectionverified': "$collections.verified.status",
            },
          },
          {
            "$match":
            {
              "$and": [
                {
                  'nftCollection': { "$regex": collectionid, "$options": "i" }
                },
                {
                  'tokenid': { "$regex": nftid, "$options": "i" }
                }
              ]
            }
          }
        ])
        result.push(...values)
      }
      return result
    }
    else {
      return []
    }
  }
}
const NFTItemsController = {
  create: async (data: NFTItem) => {
    // create or update item data
    var oldData = await NFTItems.findOne({ nftCollection: data.nftCollection.toUpperCase(), id: data.id })
    if (!oldData) {
      const newData = new NFTItems({
        ...data,
        nftCollection: data.nftCollection.toUpperCase(),
        id: data.id.length === 64 ? encodeByte32String(data.id) : data.id
      })
      await newData.save();
      return true;
    } else {
      const updateData = { ...data };
      delete updateData.nftCollection;
      await NFTItems.updateOne(
        { nftCollection: data.nftCollection.toUpperCase(), id: data.id },
        { $set: updateData }
      );
      return false;
    }
  },
  findOne: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTItems.findOne(newFilter);
  },
  find: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTItems.find(newFilter);
  },
  update: async (filter: any, newData: any) => {
    const updateData = { ...newData };
    delete updateData.nftCollection;
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTItems.updateOne(
      newFilter,
      { $set: updateData }
    );
  },
  remove: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTItems.findOneAndDelete(
      newFilter
    );
  }
}
const NFTMetaDatasController = {
  /**
   * create or update data
   * @param data 
   * @returns 
   */
  create: async (data: NFTMetaData) => {
    const updateData = { ...data };
    updateData.nftCollection = data.nftCollection.toUpperCase();
    var oldData = await NFTMetaDatas.findOne({ nftCollection: updateData.nftCollection, id: updateData.id })

    if (oldData && updateData.image === oldData.image) {
      // when image already saved on db
      updateData.coverImage = oldData.coverImage
    } else {
      // if it updates image, it uploads coverimage to ipfs with resize
      try {
        if (updateData.image.startsWith(Config.IPFS_BASEURL)) {
          updateData.coverImage = updateData.image;
        } else {
          const contents = await resizeFile(updateData.image);
          const hash = await addToIpfs(contents, "base64");
          updateData.coverImage = Config.IPFS_BASEURL + hash;
        }
      } catch (err) {
        // if error occur, remain coverimage as image
        updateData.coverImage = updateData.image
      }
    }
    if (!oldData) {
      const newData = new NFTMetaDatas({
        ...updateData,
        nftCollection: updateData.nftCollection,
        id: updateData.id.length === 64 ? encodeByte32String(updateData.id) : updateData.id
      })
      await newData.save();
      return true;
    } else {
      await NFTMetaDatas.updateOne(
        { nftCollection: updateData.nftCollection, id: updateData.id },
        { $set: updateData }
      );
      return false;
    }
  },
  findOne: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMetaDatas.findOne(newFilter);
  },
  find: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMetaDatas.find(newFilter);
  },
  update: async (filter: any, newData: any) => {
    const updateData = { ...newData };
    delete updateData.nftCollection;
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMetaDatas.updateOne(
      newFilter,
      { $set: updateData }
    );
  },
  remove: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMetaDatas.findOneAndDelete(
      newFilter
    );
  }
}

const NFTMarketDatasController = {
  create: async (data: NFTMarketData) => {
    const updateData = { ...data };
    updateData.nftCollection = data.nftCollection.toUpperCase();
    updateData.id = updateData.id.length === 64 ? encodeByte32String(updateData.id) : updateData.id;
    var oldData = await NFTMarketDatas.findOne({ nftCollection: updateData.nftCollection, id: updateData.id })
    if (!oldData) {
      const newData = new NFTMarketDatas(updateData)
      await newData.save();
      return true;
    } else {
      await NFTMarketDatas.updateOne(
        { nftCollection: data.nftCollection.toUpperCase(), id: data.id },
        { $set: data }
      );
      return false;
    }
  },
  findOne: async (filter: any): Promise<NFTOrderbook> => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMarketDatas.findOne(newFilter);
  },
  find: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMarketDatas.find(newFilter);
  },
  update: async (filter: any, newData: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    const updateData = { ...newData };
    delete updateData.nftCollection;
    return await NFTMarketDatas.updateOne(
      newFilter,
      { $set: updateData }
    );
  },
  remove: async (filter: any) => {
    const newFilter = { ...filter };
    if (newFilter.nftCollection) newFilter.nftCollection = filter.nftCollection.toUpperCase()
    return await NFTMarketDatas.findOneAndDelete(
      newFilter
    );
  }
}

export {
  NFTItemsController,
  NFTMetaDatasController,
  NFTSearchController,
  NFTMarketDatasController
}