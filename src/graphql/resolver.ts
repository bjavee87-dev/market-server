import jwt from "jsonwebtoken";
import config from "../../config.json";
import AdminController from "../admin/controller";
import AdminWalletController from '../admin/controller/wallet'
import { Activities, CollectionCacheData, NFTMetaDatas, NftTrades } from "../blockchain/model";
import { AlertController, UserController } from "../user/controller";
import { FavoriteController } from "../blockchain/controller/favorite";
import { AdminSettingController } from "../admin/controller/setting";
import { CryptoTradeController } from "../gasstation/controller";
import { CryptoTrades } from "../gasstation/model";
import { CategoryController, PaylableTokensController, TradeHistoryController } from "../blockchain/controller";
import { CollectionCacheController, CollectionsController, NFTSearchController } from "../blockchain/controller";
import { Now } from "../utils";
import setlog from "../utils/setlog";

const resolvers = {
  Query: {
    getAdmins: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args?.token || "";
        const adminData: any = await jwt.verify(token, config.JWT_SECRET);
        if (!adminData?.admin) return []
        const admins = await AdminController.findAll();
        return admins;
      } catch (err: any) {
        console.log(err)
        setlog("graphql getAdmins", err);
        return []
      }
    },

    getUsersInfo: async (parent: any, args: any, context: any, info: any) => {
      try {
        const name = args?.username || "";
        const address = args?.address || "";
        let badge = args?.badge || "";
        badge = badge.split(",");
        if ((badge.length === 1 && badge[0] === "") || (badge[0] === "not" && badge[1] === "not" && badge[2] === "not" && badge[3] === "not")) {
          badge = ["pending", "verified", "", "rejected"];
        }
        badge[4] = "not";
        if (name === "" && address === "") { //GET ALL USERS ONLY ADMIN
          const token = args?.token || "";
          let adminData: any = null;
          try {
            adminData = await jwt.verify(token, config.JWT_SECRET);
          } catch (err) {
            return []
          }
          const admin = await AdminController.findOne({
            filter: {
              email: adminData?.admin,
              "verified.status": { $in: badge }
            },
          });
          if (admin) {
            const users = await UserController.find({
              filter: {
                "verified.status": { $in: badge }
              }
            });
            return users;
          }
          else {
            return []
          }
        }
        else if (name) {
          const users = await UserController.find({
            filter: {
              $or: [{ email: name }, { name: name }],
              "verified.status": { $in: badge }
            }
          });
          return users;
        } else if (address) {
          const users = await UserController.find({
            filter: {
              address: address,
              "verified.status": { $in: badge }
            }
          });
          return users;
        }
      } catch (err: any) {
        console.log(err)
        setlog("graphql getUsersInfo", err);
        return []
      }
    },

    getUserBalance: async (parent: any, args: any, context: any, info: any) => {
      try {
        const address = args.address;
        if (address) {
          const users = await UserController.find({
            filter: { address: address }
          });
          return users[0]?.balances;
        }
      } catch (err: any) {
        setlog("graphql getUserBalance", err);
        console.log(err);
      }
    },

    getCategory: async (parent: any, args: any, context: any, info: any) => {
      try {
        const results = await CategoryController.find({});
        return results;
      } catch (err) {
        setlog("graphql getCategory", err);
        console.log(err);
      }
    },

    getCollectionInfo: async (parent: any, args: any, context: any, info: any) => {
      try {
        const address = args.address;
        const name = args.name;
        const owner = args.owner;
        const page = args.page;
        const limit = args.limit;
        const acceptedToken = args.acceptedToken;
        const sort = args.sort;
        const category = args.category?.split(",") || [];
        let collections = null;
        let badge = args?.badge || "not,not,not,not,";
        badge = badge.split(",");
        if (badge[0] === "not" && badge[1] === "not" && badge[2] === "not" && badge[3] === "not") {
          badge = ["pending", "verified", "", "rejected"]
        }
        badge[4] = "not"

        // view collection data
        if (address && address !== "") {
          collections = await CollectionsController.find({
            $or: [{ address: address.toUpperCase() }, { url: address }],
            "verified.status": { $in: badge }
          });
        }
        else if (name !== undefined && name !== null) { // search collection list
          if (name === "") {
            if (category.length > 0 && category[0] !== '') {
              collections = await CollectionsController.find({
                category: { $in: category },
                "verified.status": { $in: badge }
              },
                page,
                limit
              );
            }
            else {
              collections = await CollectionsController.find({
                "verified.status": { $in: badge }
              }, page, limit);
            }
          } else {
            collections = await CollectionsController.find({
              'metadata.name': { "$regex": name, "$options": "i" },
              "verified.status": { $in: badge }
            }, page, limit);
          }
        }
        if (owner) {
          if (address && address !== "") {
            collections = await CollectionsController.find({
              $or: [{ address: address.toUpperCase() }, { owner: address }],
              "verified.status": { $in: badge }
            });
          }
          else {
            collections = await CollectionsController.find({
              'owner': { "$regex": owner, "$options": "i" },
              "verified.status": { $in: badge }
            });
          }
        }
        for (let i = 0; i < collections.length; i++) {
          const address = collections[i]?.address;
          const cache = await CollectionCacheController.findOne({ address: address });
          collections[i] = { ...collections[i]?._doc, ...cache['_doc'] }
        }
        return collections;
      } catch (err: any) {
        setlog("graphql getCollectionInfo", err);
        console.log(err);
      }
    },

    getPrice: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args.token;
        const prices = await PaylableTokensController.getPrices(token);
        return prices;
      } catch (err: any) {
        console.log(err);
        setlog("graphql getprice", err);
      }
    },

    getAlert: async (parent: any, args: any, context: any, info: any) => {
      try {
        const address = args.address;
        const prices = await AlertController.find({
          filter: {
            $and: [
              {
                status: "pending"
              },
              {
                deleted: false
              },
              {
                $or: [{ address: address }],
              }
            ]
          }
        });
        return prices;
      } catch (err: any) {
        console.log(err);
        setlog("graphql getAlert", err);
      }
    },

    getPaylableToken: async (parent: any, args: any, context: any, info: any) => {
      try {
        const tokens = await PaylableTokensController.find({});
        return tokens;
      } catch (err: any) {
        console.log(err);
        setlog("graphql getPaylableToken", err);
      }
    },

    getFavoritedNFT: async (parent: any, args: any, context: any, info: any) => {
      try {
        const collection = args.collection;
        const nft = args.nft;
        const userAddress = args.userAddress;
        const results = await FavoriteController.find({
          collectionid: collection,
          nftid: nft,
          userAddress: userAddress
        })
        return results
      } catch (err) {
        setlog("graphql getFavoritedNFT", err);
        console.log(err);
      }
    },

    getFavoriteNFT: async (parent: any, args: any, context: any, info: any) => {
      try {
        const nfts = await NFTSearchController.favoriteList(args);
        return nfts;
      } catch (err) {
        setlog("graphql getFavoriteNFT", err);
        console.log(err);
      }
    },

    getNFTs: async (parent: any, args: any, context: any, info: any) => {
      try {
        const nfts = await NFTSearchController.search(args)
        return nfts;
      } catch (err) {
        setlog("graphql getNFTs", err);
        console.log(err);
      }
    },

    getNFTActivity: async (parent: any, args: any, context: any, info: any) => {
      try {
        const nfts = await NFTSearchController.searchActivity(args)
        return nfts;
      } catch (err) {
        setlog("graphql getNFTActivity", err);
        console.log(err);
      }
    },

    getTopCreator: async (parent: any, args: any, context: any, info: any) => {
      try {
        const result = await NFTSearchController.getTopCreator();
        return result;
      } catch (err: any) {
        console.log(err)
        setlog("graphql getTopCreator", err);
        return []
      }
    },

    getTopSellNFT: async (parent: any, args: any, context: any, info: any) => {
      try {
        const nfts = await NFTSearchController.getTopSellNFT()
        return nfts;
      } catch (err) {
        setlog("graphql getNFTs", err);
        console.log(err);
      }
    },

    getMainNFTs: async (parent: any, args: any, context: any, info: any) => {
      try {
        const nfts = await NFTSearchController.getMainNfts()
        return nfts;
      } catch (err) {
        setlog("graphql getNFTs", err);
        console.log(err);
      }
    },

    getPopularCollection: async (parent: any, args: any, context: any, info: any) => {
      try {
        let from = Now();
        const to = Now();
        const days = args.days || 7;

        if (days === 1) from -= 86400;
        else if (days === 7) from -= 604800;
        else if (days === 30) from -= 2592000;

        const ranks = await Activities.aggregate([{
          $match: { 'created': { $gt: from, $lt: to } }
        }, {
          $group: {
            _id: '$nftCollection',
            count: { $sum: 1 } // this means that the count will increment by 1
          }
        }, {
          $sort: { count: -1 }
        }, {
          $limit: 18
        }])

        //find ranking
        const collectionlist = await CollectionsController.find({}, 0, 20);
        collectionlist.sort((collectionA, collectionB) => {
          let rankA = 100, rankB = 100;

          ranks.map((v, i) => {
            if (v._id == collectionA.address) { rankA = i }
            if (v._id == collectionB.address) { rankB = i }
          })

          return rankA - rankB
        })

        let collections = [];
        for (let i = 0; i < collectionlist.length; i++) {
          const collection = collectionlist[i];
          const cache = await CollectionCacheController.findOne({ address: collection.address });
          collections.push({ ...collection['_doc'], ...cache['_doc'] })
        }

        return collections;
      } catch (err: any) {
        setlog("graphql getCollectionInfo", err);
        console.log(err);
      }
    },

    getSearch: async (parent: any, args: any, context: any, info: any) => {
      try {
        const keyword = args.keyword || "";
        if (keyword.trim().length < 1) return { collection: [], item: [], user: [] }
        let _collections = await CollectionsController.find({
          'metadata.name': { "$regex": keyword, "$options": "i" },
          hide: false
        }, 1, 10);

        const collections = [] as any[]

        if (_collections.length) {
          const _cache = await CollectionCacheData.find({ address: { $in: _collections.map(i => i.address) } });
          for (let i = 0; i < _collections.length; i++) {
            collections.push({ ..._collections[i]?._doc, ..._cache['_doc'] })
          }
        }

        // for (let i = 0; i < collections.length; i++) {
        // 	const address = collections[i]?.address;
        // 	const cache = await CollectionCacheController.findOne({ address: address });
        // 	collections[i] = { ...collections[i]?._doc, ...cache['_doc'] }
        // }

        const items = await NFTMetaDatas.aggregate([
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
            $addFields: {
              tokenid: "$items.id",
              owner: "$items.owner",
              creator: "$items.creator",
              price: "$marketdatas.price",
              pick: "$items.pick",
              hide: "$items.hide",
              acceptedToken: "$marketdatas.acceptedToken",
              expiredTime: "$marketdatas.expiredTime",
              bidders: "$orderbooks.bidders",
              startTime: "$orderbooks.startTime",
              endTime: "$orderbooks.endTime",
              saleType: "$marketdatas.saleType",
              isDigital: "$marketdatas.isDigital",
              isCopyright: "$marketdatas.isCopyright",
              isRight: "$marketdatas.isRight",
              collectionname: "$collections.metadata.name",
              collectionverified: "$collections.verified.status",
            },
          }, {
            $match: {
              $and: [
                { collectionname: { $regex: keyword, $options: "i" } }
              ]
            }
          }, {
            $sort: { _id: -1 }
          }
        ]).skip(0).limit(10).exec();

        const users = await UserController.find({
          filter: {
            name: { $regex: keyword, $options: "i" }
          }
        })

        return { collection: collections, item: items, user: users }
      } catch (err: any) {
        console.log(err.message);
        setlog("graphql getCollectionInfo", err);
        return { collection: [], item: [], user: [] };
      }
    },

    getAdminWallet: async (parent: any, args: any, context: any, info: any) => {
      try {
        const address = await AdminWalletController.findAll();
        let addresses = {
          nft: '',
          treasury: '',
          collection: '',
          exchange: '',
          marketplace: ''
        };
        const alerts = {
          nft: [],
          treasury: [],
          collection: [],
          exchange: [],
          marketplace: []
        }
        address.forEach(wallet => {
          addresses[wallet.type] = wallet.publickey;
          alerts[wallet.type] = wallet.alertLimit
        })
        return { addresses: addresses, alerts: alerts };
      } catch (err: any) {
        setlog("graphql getAdminWallet", err);
        console.log(err);
      }
    },

    getFee: async (parent: any, args: any, context: any, info: any) => {
      try {
        const setting = await AdminSettingController.getSetting();
        return { tradeFee: setting.nftTradeFee || 0, exchangeFee: setting.exchangeFee || 0 };
      } catch (err: any) {
        setlog("graphql getFee", err);
        console.log(err);
      }
    },

    getAdminTradeBase: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args.token || "";
        return jwt.verify(
          token,
          config.JWT_SECRET,
          async (err: any, adminData: any) => {
            if (err) return null;
            const user = await UserController.find({
              filter: {
                email: adminData.admin,
                lasttime: { "$gt": (Now() - 86400) },
              },
            });
            if (user.length === 0) return null;
            const admin = await AdminController.findOne({
              filter: {
                email: adminData.admin
              },
            });
            if (!admin?.allow) return null;
            const now = new Date();
            const todayValue = ((await CryptoTradeController.findOne({ date: now.toLocaleDateString() }))?.tradeVolumeJpy || 0) + ((await TradeHistoryController.findOne({ date: now.toLocaleDateString() }))?.tradeVolumeJpy || 0);
            const yesterday = now.setDate(now.getDate() - 1);
            const yesterdayValue = ((await CryptoTradeController.findOne({ date: new Date(yesterday).toLocaleDateString() }))?.tradeVolumeJpy || 0) + ((await TradeHistoryController.findOne({ date: new Date(yesterday).toLocaleDateString() }))?.tradeVolumeJpy || 0);
            const agoWeek = new Date(new Date().setDate(now.getDate() - 5));
            const weekByToday = (await CryptoTradeController.find({
              date: {
                $lte: new Date().toLocaleDateString(),
                $gte: agoWeek.toLocaleDateString()
              }
            })).concat(
              await TradeHistoryController.find({
                date: {
                  $lte: new Date().toLocaleDateString(),
                  $gte: agoWeek.toLocaleDateString()
                }
              })
            )
            const weekByYesterday = (await CryptoTradeController.find(
              {
                date: {
                  $lte: new Date(yesterday).toLocaleDateString(),
                  $gte: new Date(new Date().setDate(now.getDate() - 6)).toLocaleDateString()
                }
              })).concat(
                await TradeHistoryController.find(
                  {
                    date: {
                      $lte: new Date(yesterday).toLocaleDateString(),
                      $gte: new Date(new Date().setDate(now.getDate() - 6)).toLocaleDateString()
                    }
                  })
              )
            let weekValue = 0;
            weekByToday.forEach(v => {
              weekValue += v.tradeVolumeJpy;
            })
            let week2Value = 0;
            weekByYesterday.forEach(v => {
              week2Value += v.tradeVolumeJpy;
            })
            const totalByToday = (await CryptoTradeController.find(
              {
                date: {
                  $lte: new Date().toLocaleDateString()
                }
              })).concat(
                await TradeHistoryController.find(
                  {
                    date: {
                      $lte: new Date().toLocaleDateString()
                    }
                  })
              )
            const totayByYesterday = (await CryptoTradeController.find(
              {
                date: {
                  $lte: new Date(yesterday).toLocaleDateString()
                }
              })).concat(
                await TradeHistoryController.find(
                  {
                    date: {
                      $lte: new Date(yesterday).toLocaleDateString()
                    }
                  })
              )
            let totalValue1 = 0, totalValue2 = 0;
            totalByToday.forEach(v => {
              totalValue1 += v.tradeVolumeJpy;
            })
            totayByYesterday.forEach(v => {
              totalValue2 += v.tradeVolumeJpy;
            })

            return {
              today: todayValue,
              yesterday: yesterdayValue,
              week: weekValue,
              week2: week2Value,
              total: totalValue1,
              total2: totalValue2,
            }
          }
        )
      } catch (err: any) {
        setlog("graphql getFee", err);
        console.log(err);
      }

    },

    getTradeChart: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args.token || "";
        return jwt.verify(
          token,
          config.JWT_SECRET,
          async (err: any, adminData: any) => {
            if (err) return null;
            const user = await UserController.find({
              filter: {
                email: adminData.admin,
                lasttime: { "$gt": (Now() - 86400) },
              },
            });
            if (user.length === 0) return null;
            const admin = await AdminController.findOne({
              filter: {
                email: adminData.admin
              },
            });
            if (!admin?.allow) return null;
            const now = new Date();
            const monthlyDate = await NftTrades.aggregate([
              {
                $match: {
                  date: {
                    $gte: new Date(new Date().setDate(now.getDate() - 30)),
                    $lte: new Date()
                  }
                }
              }, {
                $group: {
                  _id: '$date',
                  tradeVolumeUsd: { $sum: "$tradeVolumeUsd" },
                  tradeVolumeJpy: { $sum: "$tradeVolumeJpy" },
                  tradeVolumeSymbol: { $sum: "$tradeVolumeSymbol" },
                  feeSymbol: { $sum: "$feeSymbol" },
                  feeJpy: { $sum: "$feeJpy" },
                }
              }, {
                $sort: { _id: -1 }
              }
            ])

            return { data: monthlyDate }
          }
        )
      } catch (err: any) {
        setlog("graphql getFee", err);
        console.log(err);
      }

    },

    getCryptoChart: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args.token || "";
        return jwt.verify(
          token,
          config.JWT_SECRET,
          async (err: any, adminData: any) => {
            if (err) return null;
            const user = await UserController.find({
              filter: {
                email: adminData.admin,
                lasttime: { "$gt": (Now() - 86400) },
              },
            });
            if (user.length === 0) return null;
            const admin = await AdminController.findOne({
              filter: {
                email: adminData.admin
              },
            });
            if (!admin?.allow) return null;
            const now = new Date();
            const monthlyDate = await CryptoTrades.aggregate([
              {
                $match: {
                  date: {
                    $gte: new Date(new Date().setDate(now.getDate() - 30)),
                    $lte: new Date()
                  }
                }
              }, {
                $group: {
                  _id: '$date',
                  tradeVolumeUsd: { $sum: "$tradeVolumeUsd" },
                  tradeVolumeJpy: { $sum: "$tradeVolumeJpy" },
                  tradeVolumeSymbol: { $sum: "$tradeVolumeSymbol" },
                  feeSymbol: { $sum: "$feeSymbol" },
                  feeJpy: { $sum: "$feeJpy" },
                }
              }, {
                $sort: { _id: -1 }
              }
            ]);

            return { data: monthlyDate }
          }
        )
      } catch (err: any) {
        setlog("graphql getFee", err);
        console.log(err);
      }
    },

    getTradeSymbol: async (parent: any, args: any, context: any, info: any) => {
      try {
        const token = args.token || "";
        return jwt.verify(
          token,
          config.JWT_SECRET,
          async (err: any, adminData: any) => {
            if (err) return null;
            const user = await UserController.find({
              filter: {
                email: adminData.admin,
                lasttime: { "$gt": (Now() - 86400) },
              },
            });
            if (user.length === 0) return null;
            const admin = await AdminController.findOne({
              filter: {
                email: adminData.admin
              },
            });
            if (!admin?.allow) return null;
            const nftData = await NftTrades.aggregate([
              {
                $group: {
                  _id: '$symbol',
                  tradeVolumeUsd: { $sum: "$tradeVolumeUsd" },
                  tradeVolumeJpy: { $sum: "$tradeVolumeJpy" },
                  tradeVolumeSymbol: { $sum: "$tradeVolumeSymbol" },
                  feeSymbol: { $sum: "$feeSymbol" },
                  feeJpy: { $sum: "$feeJpy" }
                },
              },
              {
                $project:
                {
                  _id: 0,
                  symbol: "$_id",
                  tradeVolumeUsd: "$tradeVolumeUsd",
                  tradeVolumeJpy: "$tradeVolumeJpy",
                  tradeVolumeSymbol: "$tradeVolumeSymbol",
                  feeSymbol: "$feeSymbol",
                  feeJpy: "$feeJpy"
                }
              }
            ]);
            const cryptoData = await CryptoTrades.aggregate([
              {
                $group: {
                  _id: '$symbol',
                  tradeVolumeUsd: { $sum: "$tradeVolumeUsd" },
                  tradeVolumeJpy: { $sum: "$tradeVolumeJpy" },
                  tradeVolumeSymbol: { $sum: "$tradeVolumeSymbol" },
                  feeSymbol: { $sum: "$feeSymbol" },
                  feeJpy: { $sum: "$feeJpy" }
                }
              },
              {
                $project:
                {
                  _id: 0,
                  symbol: "$_id",
                  tradeVolumeUsd: "$tradeVolumeUsd",
                  tradeVolumeJpy: "$tradeVolumeJpy",
                  tradeVolumeSymbol: "$tradeVolumeSymbol",
                  feeSymbol: "$feeSymbol",
                  feeJpy: "$feeJpy"
                }
              }
            ]);
            console.log(
              {
                nft: nftData,
                crypto: cryptoData
              }
            )
            return {
              nft: nftData,
              crypto: cryptoData
            }
          }
        )
      } catch (err: any) {
        setlog("graphql getFee", err);
        console.log(err);
      }
    }
  }
}

export { resolvers }
