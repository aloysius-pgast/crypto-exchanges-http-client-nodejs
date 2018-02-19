"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

/* Creates an alert if USDT-NEO last price on Binance is in range [130,141] AND NEO price on CoinMarketCap is > 130 */

/* define conditions */
let conditionBuilder = client.alertConditionBuilder();
conditionBuilder.exchange('binance', 'USDT-NEO', 'last', 'in', [130,141]).coinmarketcap('NEO', 'price_usd', 'gt', 130);

/* add option to receive a pushOver alert when alert becomes active */
let options = {pushover:{enabled:true}};
client.newAlert('MyAlert', conditionBuilder, options).then(function(data){
    console.log(data);
}).catch(function(err){
    console.log(err);
});
