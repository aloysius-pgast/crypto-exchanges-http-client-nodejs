"use strict";
const debug = require('debug')('CEHC:Client');
const _ = require('lodash');
const request = require('request');
const AlertConditionBuilder = require('./alert-condition-builder');

const DEFAULT_SOCKETTIMEOUT = 10 * 1000;

/**
 * Promise reflector
 */
const reflect = (descriptor, opt) => {
    return descriptor.promise.then(function(data){
        return {success:true, value:data, context:descriptor.context};
    }).catch(function(err){
        if (!opt.stopOnError)
        {
            return {success:false, value:err, context:descriptor.context};
        }
        throw err;
    });
};

/**
 * Each array entry can be either a Promise object or an object {promise:Promise, context:{}}
 * opt.stopOnError : stop after one error (like default Promise.all behaviour)
 */
const allPromises = (arr, opt) => {
    let options = {stopOnError:false};
    if (undefined !== opt)
    {
        if (undefined !== opt.stopOnError)
        {
            options.stopOnError = opt.stopOnError;
        }
    }
    return Promise.all(arr.map(function(entry) {
        // probably a promise
        if ('function' == typeof entry.then)
        {
            entry = {promise:entry, context:{}};
        }
        else if (undefined === entry.context)
        {
            entry.context = {};
        }
        return reflect(entry, options);
    }));
}

class Client
{

constructor(baseUri, options)
{
    // the uri we want to connect to
    this._baseUri = baseUri;
    if (!baseUri.startsWith('http://') && !baseUri.startsWith('https://'))
    {
        throw new Error("Argument 'baseUri' should start with 'http://' or 'https://'");
    }
    this._apiKey = '';
    if (undefined !== options)
    {
        if (undefined !== options.apiKey && '' != options.apiKey)
        {
            this._apiKey = options.apiKey;
        }
    }
}

/**
 * Returns a promise which will reject with a given error (internal use)
 */
_getPromisedError(message)
{
    return new Promise((resolve, reject) => {
        reject({origin:'client', error:message});
    });
}

/**
 * Checks exchange parameter. Returns a promise on error & null on success (internal use)
 */
_checkExchange(exchange)
{
    if ('string' !== typeof exchange || '' == exchange)
    {
        return this._getPromisedError("Argument 'exchange' should be a non-empty string");
    }
    return null;
}

/**
 * Checks exchange and pair parameters. Returns a promise on error & null on success (internal use)
 */
_checkExchangeAndPair(exchange, pair)
{
    if ('string' !== typeof exchange || '' == exchange)
    {
        return this._getPromisedError("Argument 'exchange' should be a non-empty string");
    }
    if ('string' !== typeof pair || '' == pair)
    {
        return this._getPromisedError("Argument 'pair' should be a non-empty string");
    }
    return null;
}

/**
 * Checks exchange and pairs parameters. Returns a promise on error & null on success (internal use)
 */
_checkExchangeAndPairs(exchange, pairs)
{
    if ('string' !== typeof exchange || '' == exchange)
    {
        return this._getPromisedError("Argument 'exchange' should be a non-empty string");
    }
    if (undefined !== pairs)
    {
        if (!Array.isArray(pairs))
        {
            return this._getPromisedError("Argument 'pairs' should be an array");
        }
    }
    return null;
}

/**
 * Builds an url from a path
 */
_getUrl(path)
{
    return `${this._baseUri}/${path}`
}

/**
 * Builds an url from an exchange identifier & a path
 */
_getExchangeUrl(exchange, path)
{
    return `${this._baseUri}/exchanges/${exchange}/${path}`
}

/**
 * Performs the request (internal use)
 * @param {string} method http method
 * @param {string} url to call
 * @param {object} params request query parameters
 * @param {boolean} json whether or not we should send a json body
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
_makeRequest(method, url, params, jsonBody)
{
    if (undefined === jsonBody)
    {
        jsonBody = false;
    }
    let options = {
        json:true,
        timeout:DEFAULT_SOCKETTIMEOUT,
        method:method,
        url:url
    };
    if (undefined !== params)
    {
        if (jsonBody)
        {
            options.body = params;
        }
        else
        {
            options.qs = params;
        }
    }
    if ('' !== this._apiKey)
    {
        options.headers = {
            'ApiKey':this._apiKey
        }
    }
    if (debug.enabled)
    {
        debug(`REQ: ${method} ${url} ${JSON.stringify(params || {})}`);
    }
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            // client error
            if (null !== error)
            {
                let err;
                if (undefined !== error.message)
                {
                    err = {origin:"client","error":error.message};
                }
                else
                {
                    err = {origin:"client","error":"unknown error"};
                }
                if (debug.enabled)
                {
                    debug(`ERR: ${JSON.stringify(err)}`);
                }
                reject(err);
                return;
            }
            if (200 != response.statusCode)
            {
                if (debug.enabled)
                {
                    debug(`ERR: ${JSON.stringify(body)}`);
                }
                reject(body);
                return;
            }
            if (debug.enabled)
            {
                debug(`RES: ${JSON.stringify(body)}`);
            }
            resolve(body);
        });
    });
}

/**
 * List all exchanges enabled on the gateway
 *
 * @param {string} options.pair used to list only the exchanges supporting a given pair (optional)
 * @param {string} options.currency used to list only pairs having a given currency (optional, will be ignored if options.pair is set)
 * @param {string} options.baseCurrency used to list only pairs having a given base currency (optional, will be ignored if options.pair or options.currency are defined)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
exchanges(options)
{
    let url = this._getUrl('exchanges')
    let params = {};
    if (undefined !== options)
    {
        if (undefined !== options.pair && '' != options.pair)
        {
            params.pair = options.pair;
        }
        else if (undefined !== options.currency && '' != options.currency)
        {
            params.currency = options.currency;
        }
        else if (undefined !== options.baseCurrency && '' != options.baseCurrency)
        {
            params.baseCurrency = options.baseCurrency;
        }
    }
    return this._makeRequest('GET', url, params);
}

/**
 * List available pairs for a given exchange
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} options.currency used to list only pairs having a given currency (optional)
 * @param {string} options.baseCurrency used to list only pairs having a given base currency (optional, will be ignored if options.currency is defined)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
pairs(exchange, options)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    let params = {};
    if (undefined !== options)
    {
        if (undefined !== options.currency && '' != options.currency)
        {
            params.currency = options.currency;
        }
        else if (undefined !== options.baseCurrency && '' != options.baseCurrency)
        {
            params.baseCurrency = options.baseCurrency;
        }
    }
    let url = this._getExchangeUrl(exchange, 'pairs')
    return this._makeRequest('GET', url, params);
}

/**
 * Search for pairs across based on a base currency or a currency
 *
 * @param {string} search currency/base currency to search
 * @param {string} type (currency|baseCurrency)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
findPairs(search, type)
{
    if ((undefined === search || '' == search))
    {
        return this._getPromisedError("Argument 'search' should be a non-empty string");
    }
    let options = {};
    // by default, search for currency
    if (undefined === type)
    {
        type = 'currency';
    }
    else
    {
        if ('currency' != type && 'baseCurrency' != type)
        {
            return this._getPromisedError("Argument 'type' should be one of (currency,baseCurrency)");
        }
    }
    if ('currency' == type)
    {
        options.currency = search;
    }
    else
    {
        options.baseCurrency = search;
    }
    let self = this;
    return new Promise((resolve, reject) => {
        let list = [];
        self.exchanges(options).then(function(data){
            let arr = [];
            for (var i = 0; i < data.length; ++i)
            {
                let p = self.pairs(data[i], options);
                arr.push({promise:p, context:{exchange:data[i]}});
            }
            allPromises(arr).then(function(data){
                _.forEach(data, function (entry) {
                    // could not retrieve pairs for this exchange
                    if (!entry.success)
                    {
                        return;
                    }
                    _.forEach(entry.value, (obj) => {
                        if ('currency' == type)
                        {
                            if (search != obj.currency)
                            {
                                return;
                            }
                        }
                        // check baseCurrency
                        else
                        {
                            if (search != obj.baseCurrency)
                            {
                                return;
                            }
                        }
                        list.push({exchange:entry.context.exchange,pair:obj.pair,currency:obj.currency,baseCurrency:obj.baseCurrency});
                    });
                });
                resolve(list);
            });
        }).catch(function(err){
            reject(err);
            return;
        });
    });
}

/**
 * Retrieves tickers
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {array|undefined} pairs array of pairs (optional, tickers for all pairs will be retrieved if not set)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
tickers(exchange, pairs)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    let params = {};
    if (undefined !== pairs && 0 !== pairs.length)
    {
        params.pairs = pairs;
    }
    let url = this._getExchangeUrl(exchange, 'tickers')
    return this._makeRequest('GET', url, params);
}

/**
 * Retrieves order book for a given pair
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} pair pair to retrieve order book for
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
orderBook(exchange, pair)
{
    let err = this._checkExchangeAndPair(exchange, pair);
    if (null !== err)
    {
        return err;
    }
    let url = this._getExchangeUrl(exchange, `orderBooks/${pair}`)
    return this._makeRequest('GET', url);
}

/**
 * Retrieves trades for a given pair
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} pair pair to retrieve trades for
 * @param {integer} afterTradeId only retrieve trades with an id > afterTradeId
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
trades(exchange, pair, afterTradeId)
{
    let err = this._checkExchangeAndPair(exchange, pair);
    if (null !== err)
    {
        return err;
    }
    if (undefined !== afterTradeId)
    {
        let value = parseInt(afterTradeId);
        if (isNaN(value))
        {
            return this._getPromisedError("Argument 'afterTradeId' should be an integer");
        }
    }
    let params = {
        afterTradeId:afterTradeId
    };
    let url = this._getExchangeUrl(exchange, `trades/${pair}`)
    return this._makeRequest('GET', url, params);
}

/**
 * Retrieves open orders
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {array|undefined} pairs array of pairs (optional, open orders for all pairs will be retrieved if not set)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
openOrders(exchange, pairs)
{
    let err = this._checkExchangeAndPairs(exchange, pairs);
    if (null !== err)
    {
        return err;
    }
    let params = {};
    if (undefined !== pairs && 0 !== pairs.length)
    {
        params.pairs = pairs;
    }
    let url = this._getExchangeUrl(exchange, 'openOrders')
    return this._makeRequest('GET', url, params);
}

/**
 * Retrieves a single open order
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} orderNumber order number
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
openOrder(exchange, orderNumber)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    if (undefined === orderNumber || '' == orderNumber)
    {
        return this._getPromisedError("Argument 'orderNumber' should be a non-empty string");
    }
    let url = this._getExchangeUrl(exchange, `openOrders/${orderNumber}`)
    return this._makeRequest('GET', url);
}

/**
 * Retrieves closed orders
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {array|undefined} pairs array of pairs (optional, closed orders for all pairs will be retrieved if not set)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
closedOrders(exchange, pairs)
{
    let err = this._checkExchangeAndPairs(exchange);
    if (null !== err)
    {
        return err;
    }
    let params = {};
    if (undefined !== pairs && 0 !== pairs.length)
    {
        params.pairs = pairs;
    }
    let url = this._getExchangeUrl(exchange, 'closedOrders')
    return this._makeRequest('GET', url, params);
}

/**
 * Retrieves a single closed order
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} orderNumber order number of the order to retrieve
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
closedOrder(exchange, orderNumber)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    if (undefined === orderNumber || '' == orderNumber)
    {
        return this._getPromisedError("Argument 'orderNumber' should be a non-empty string");
    }
    let url = this._getExchangeUrl(exchange, `closedOrders/${orderNumber}`)
    return this._makeRequest('GET', url);
}

/**
 * Creates a new order
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} pair (ex: USDT-BTC)
 * @param {string} orderType order type (buy|sell)
 * @param {float} quantity quantity to buy/sell
 * @param {float} rate buy/sell price
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
newOrder(exchange, pair, orderType, quantity, rate)
{
    let err = this._checkExchangeAndPair(exchange, pair);
    if (null !== err)
    {
        return err;
    }
    let params = {pair:pair};
    if (undefined === orderType || ('buy' !== orderType && 'sell' !== orderType))
    {
        return this._getPromisedError("Argument 'orderType' should be one of (buy,sell)");
    }
    else
    {
        params.orderType = orderType;
    }
    if (undefined == quantity)
    {
        return this._getPromisedError("Argument 'quantity' should be a float > 0");
    }
    else
    {
        let value = parseFloat(quantity);
        if (isNaN(value) || value <= 0)
        {
            return this._getPromisedError("Argument 'quantity' should be a float > 0");
        }
        params.quantity = value;
    }
    if (undefined == rate)
    {
        return this._getPromisedError("Argument 'rate' should be a float > 0");
    }
    else
    {
        let value = parseFloat(rate);
        if (isNaN(value) || value <= 0)
        {
            return this._getPromisedError("Argument 'rate' should be a float > 0");
        }
        params.targetRate = value;
    }
    let url = this._getExchangeUrl(exchange, 'openOrders');
    return this._makeRequest('POST', url, params);
}

/**
 * Cancels an order
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} orderNumber number of the order to cancel
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
cancelOrder(exchange, orderNumber)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    if (undefined === orderNumber || '' == orderNumber)
    {
        return this._getPromisedError("Argument 'orderNumber' should be a non-empty string");
    }
    let url = this._getExchangeUrl(exchange, `openOrders/${orderNumber}`)
    return this._makeRequest('DELETE', url);
}

/**
 * Retrieves balances for all currencies with a balance > 0 (ie: amount(available) + amount(on orders) must be > 0)
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
balances(exchange)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    let url = this._getExchangeUrl(exchange, 'balances')
    return this._makeRequest('GET', url);
}

/**
 * Retrieves balance for a single currency. Currency will be ignored if balance is <= 0 (ie: amount(available) + amount(on orders) must be > 0)
 *
 * @param {string} exchange exchange identifier (ex: bittrex)
 * @param {string} currency currency to retrieve balance for (ex: BTC)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
balance(exchange, currency)
{
    let err = this._checkExchange(exchange);
    if (null !== err)
    {
        return err;
    }
    if (undefined === currency || '' == currency)
    {
        return this._getPromisedError("Argument 'currency' should be a non-empty string");
    }
    let url = this._getExchangeUrl(exchange, `balances/${currency}`)
    return this._makeRequest('GET', url);
}

/**
 * Retrieves CoinMarketCap data
 *
 * NB: it is possible to pass 'options' parameter only
 *
 * @param {array} symbols array of symbols (ex: ['BTC','ETH']) (optional)
 * @param {integer} options.limit limit result size (optional)
 * @param {string} options.convertTo convert currencies (to get an extra currency != usd in result) (optional)
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
coinMarketCapTickers(symbols, options)
{
    let params = {};
    let opt;
    if (undefined !== symbols)
    {
        if (undefined !== options)
        {
            opt = options;
        }
        if (Array.isArray(symbols))
        {
            if (0 !== symbols.length)
            {
                params.symbols = symbols;
            }
        }
        else if ('object' == typeof(symbols) && undefined === opt)
        {
            opt = symbols;
        }
    }
    else
    {
        opt = {};
    }
    if (undefined !== opt.limit)
    {
        let value = parseInt(opt.limit);
        if (isNaN(value) || value <= 0)
        {
            return this._getPromisedError("Argument 'options.limit' should be an integer > 0");
        }
        params.limit = value;
    }
    if (undefined !== opt.convertTo && '' != opt.convertTo)
    {
        params.convert = opt.convertTo;
    }
    let url = this._getUrl('coinmarketcap/tickers')
    return this._makeRequest('GET', url, params);
}

/**
 * Returns all existing symbols
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
coinMarketCapSymbols()
{
    let url = this._getUrl('coinmarketcap/symbols')
    return this._makeRequest('GET', url);
}

/**
 * Returns all existing convert currencies
 * @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
 */
coinMarketCapConvertCurrencies()
{
    let url = this._getUrl('coinmarketcap/convertCurrencies');
    return this._makeRequest('GET', url);
}

/**
* Sends a push notification using PushOver
*
* @param {string} message message to send
* @param {string} options.format message format html|text (optional, default = html)
* @param {string} options.title notification title (optional)
* @param {string} options.sound sound which will be played upon receiving notification (optional)
* @param {string} options.device used to send notification to a single device (optional)
* @param {string} options.priority message priority (lowest, low, normal, high, emergency)
* @param {integer} options.retry  keep notifying user every X seconds until acknowledged (optional, min = 30) (ignored if 'options.priority' != 'emergency')
* @param {integer} options.expire specifies how many seconds notification will continue to be retried for (every retry seconds). If the notification has not been acknowledged in expire seconds, it will be marked as expired and will stop being sent to the user (optional, max = 10800) (ignored if 'priority' != 'emergency')
* @param {integer} options.timestamp can be used to override message timestamp
* @param {string} options.url url to open
* @param {string} options.urlTitle title to display instead of the url (will be ignored if 'options.url' is not set)
* @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
*/
pushOverNotify(message, options)
{
    if (undefined === message || '' == message)
    {
        return this._getPromisedError("Argument 'message' should be a non-empty string");
    }
    let params = {
        message:message
    };
    if (undefined !== options)
    {
        if (undefined !== options.format)
        {
            if ('text' != options.format && 'html' != options.format)
            {
                return this._getPromisedError("Argument 'options.format' should be one of (html,text)");
            }
        }
        _.forEach(['title','sound','device','priority','retry','expire','timestamp'], (key) => {
            if (undefined !== options[key])
            {
                params[key] = options[key];
            }
        });
        if (undefined !== options.url && '' != options.url)
        {
            params.url = options.url;
            if (undefined !== options.urlTitle && '' != options.urlTitle)
            {
                params.urlTitle = options.urlTitle;
            }
        }
    }
    let url = this._getUrl('pushover/notify');
    return this._makeRequest('POST', url, params);
}

/**
 * Returns a new object to help build condition
 */
alertConditionBuilder()
{
    return new AlertConditionBuilder();
}

/**
 * Retrieves a list of existing alerts
 * @param {integer} id alert id
 */
alert(id)
{
    let url = this._getUrl(`tickerMonitor/${id}`);
    return this._makeRequest('GET', url);
}

/**
 * Retrieves a single alert
 * @param {string} name used to only retrieve alerts matching a given name (optional)
 */
alerts(name)
{
    let params = {};
    if (undefined !== name && '' != name)
    {
        params.name = name;
    }
    let url = this._getUrl('tickerMonitor');
    return this._makeRequest('GET', url, params);
}

/**
* Declares a new alert
*
* @param {string} name alert name
* @param {object[]|AlertConditionBuilder} conditions array of conditions
* @param {boolean} options.enabled whether or not alert should be enabled (optional, default = true)
* @param {string} options.any whether or not one condition is enough to make alert active (optional, default = false)
* @param {boolean} options.pushover.enabled whether or not pushover should be enabled (optional, default = false)
* @param {string} options.pushover.priority (push over priority, default = normal)
* @param {string} options.pushover.minDelay (minimum number of seconds between 2 notifications, to avoid spamming) (optional, default = 300, 5 min)
* @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
*/
newAlert(name, conditions, options)
{
    if (!conditions instanceof AlertConditionBuilder && !Array.isArray(conditions))
    {
        throw new Error("Argument 'conditions' should be an 'AlertConditionBuilder' object or an array");
    }
    if (undefined === options)
    {
        options = {};
    }
    let params = {
        name:name,
        enabled:true,
        any:false,
        pushover:{
            enabled:false
        }
    }
    if (false === options.enabled)
    {
        params.enabled = false;
    }
    if (false === options.any)
    {
        params.any = false;
    }
    if (undefined !== options.pushover && true === options.pushover.enabled)
    {
        params.pushover.enabled = true;
        params.pushover.priority = 'normal';
        params.pushover.minDelay = 300;
        if (undefined !== options.pushover.priority)
        {
            params.pushover.priority = options.pushover.priority;
        }
        if (undefined !== options.pushover.minDelay)
        {
            params.pushover.priority = options.pushover.minDelay;
        }
    }
    if (conditions instanceof AlertConditionBuilder)
    {
        params.conditions = conditions.get();
    }
    else
    {
        params.conditions = conditions;
    }
    let url = this._getUrl('tickerMonitor');
    return this._makeRequest('POST', url, params, true);
}

/**
* Updates an existing alert
*
* @param {integer} id alert id
* @param {string} options.name new alert name (optional)
* @param {object[]|AlertConditionBuilder} options.conditions new conditions (optional)
* @param {boolean} options.enabled whether or not alert should be enabled (optional)
* @param {string} options.any whether or not one condition is enough to make alert active (optional)
* @param {boolean} options.pushover.enabled whether or not pushover should be enabled (optional)
* @param {string} options.pushover.priority (push over priority)
* @param {string} options.pushover.minDelay (minimum number of seconds between 2 notifications, to avoid spamming) (optional)
* @return {Promise} Promise which will resolve to the data returned by gateway or reject with an error {origin:string, error:string}
*/
updateAlert(id, options)
{
    if (undefined === options)
    {
        options = {};
    }
    let params = {};
    if (undefined !== options.conditions)
    {
        if (!options.conditions instanceof AlertConditionBuilder && !Array.isArray(options.conditions))
        {
            throw new Error("Argument 'options.conditions' should be an 'AlertConditionBuilder' object or an array");
        }
        if (options.conditions instanceof AlertConditionBuilder)
        {
            params.conditions = options.conditions.get();
        }
        else
        {
            params.conditions = options.conditions;
        }
    }
    _.forEach(['name','enabled','any','pushover'], (k) => {
        if (undefined !== options[k])
        {
            params[k] = options[k];
        }
    });
    let url = this._getUrl(`tickerMonitor/${id}`);
    return this._makeRequest('PATCH', url, params, true);
}

/**
 * Enables / disables a list of alerts
 * @param {boolean} flag true to enable alerts, false to disable alerts
 * @param {integer[]} list array of alerts id to enable/disable
 */
enableAlerts(flag, list)
{
    let params = {
        enabled:flag,
        list:list
    }
    let url = this._getUrl(`tickerMonitor`);
    return this._makeRequest('PATCH', url, params, true);
}

/**
 * Deletes a list of alerts
 * @param {integer[]} list array of alerts id to delete
 */
deleteAlerts(list)
{
    let params = {
        list:list
    }
    let url = this._getUrl(`tickerMonitor`);
    return this._makeRequest('DELETE', url, params, true);
}

}
module.exports = Client;
