const MongoClient = require('mongodb').MongoClient;
const moment = require('moment');

let cachedCollection = null;
async function connectToDatabase(uri) {
  if (cachedCollection) {
    return cachedCollection;
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db('dai-stablecoin');
  const collection = await db.collection('trades');

  cachedCollection = collection;
  return collection;
}

module.exports = async (_, res) => {
  const collection = await connectToDatabase(process.env.MONGODB_URI);

  const weekAgo = moment().subtract(7, 'days').unix();

  const trades = await (
    await collection.find(
      {
        timestamp: {
          $gte: weekAgo,
        },
      },
      { sort: { timestamp: -1 } }
    )
  ).toArray();
  trades.forEach((trade) => {
    delete trade._id;
    delete trade.pair;
  });
  res.setHeader('cache-control', 's-maxage=540, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(trades);
};
