# crypto-exchanges-http-client

Node.js client for [Crypto Exchange Gateway](https://github.com/aloysius-pgast/crypto-exchanges-gateway)

## Supported methods

- _pairs_ : to list all pairs available on a given exchange
- _findPairs_ : to find all pairs having a given currency or base currency across all exchanges
- _tickers_ : to list tickers for a list of pairs on a given exchange
- _orderBook_ : to retrieve order book for a given pair on a given exchange
- _trades_ : to list last trades for a given pair on a given exchange
- _openOrders_ : to list open orders on a given exchange
- _closedOrders_ : to list closed orders on a given exchange
- _newOrder_ : to create a new order for a given pair on a given exchange
- _balances_ : to list available balances on a given exchange

## How to use it

See [examples in _examples_ directory](https://github.com/aloysius-pgast/crypto-exchanges-http-client-nodejs/tree/master/examples/) for some examples
