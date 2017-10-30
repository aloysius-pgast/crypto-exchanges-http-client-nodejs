"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

console.log("Retrieving USDT-BTC order book from Bittrex & Poloniex...")

//-- retrieve USDT-BTC order book from Bittrex
client.orderBook('bittrex', 'USDT-BTC')
    .then(function(data){
        console.log('Order book from Bittrex:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });

//-- retrieve USDT-BTC order book from Poloniex
client.orderBook('poloniex', 'USDT-BTC')
    .then(function(data){
        console.log('Order book from Poloniex:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
