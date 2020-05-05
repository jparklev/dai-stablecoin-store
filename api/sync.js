const MongoClient = require('mongodb').MongoClient;
global.fetch = require('node-fetch');
const d3 = require('d3');

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

// The main, exported, function of the endpoint,
// dealing with the request and subsequent response
module.exports = async (req, res) => {
  if (
    req.body &&
    req.body.codeword &&
    req.body.codeword === process.env.PING_CW
  ) {
    const collection = await connectToDatabase(process.env.MONGODB_URI);

    const cursor = await collection.find({}, { sort: { timestamp: -1 } });

    const { timestamp: latestStoredTrade } = await cursor.next();

    const trades30D = await d3.csv(
      'https://dai.stablecoin.science/data/ETHDAI-trades-30d.csv',
      d3.autoType
    );

    const newTrades = trades30D.filter(
      (trade) => trade.timestamp > latestStoredTrade
    );

    if (newTrades.length === 0) {
      res.status(200).json({ ok: 1, n: 0 });
    } else {
      const { result: insertMeta } = await collection.insertMany(newTrades, {
        ordered: true,
      });

      res.status(200).json(insertMeta);
    }
  } else {
    res.status(401).json({ ok: 0 });
  }
};
