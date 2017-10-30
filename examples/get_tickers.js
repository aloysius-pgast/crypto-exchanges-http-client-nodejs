"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

console.log("Retrieving USDT-BTC & USDT-ETH tickers from Bittrex & Binance...")

//-- retrieve USDT-BTC & USDT-ETH tickers from Bittrex
client.tickers('bittrex', ['USDT-BTC','USDT-ETH'])
    .then(function(data){
        console.log('Tickers from Bittrex:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });

//-- retrieve USDT-BTC & USDT-ETH tickers from Binance
client.tickers('binance', ['USDT-BTC','USDT-ETH'])
    .then(function(data){
        console.log('Tickers from Binance:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
