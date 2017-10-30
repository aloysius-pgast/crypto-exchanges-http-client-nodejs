"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

/*
 NB: following will only work if you have configured key & secret on gateway
 */

console.log("Buying BTC on Bittrex...")

client.newOrder('bittrex', 'USDT-BTC', 'buy', 0.001, 5000)
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
