"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

/*
 NB: following will only work if you have configured key & secret on gateway
 */

console.log("Listing open orders from Bittrex & Poloniex...")

//-- retrieve open orders from Bittrex
client.openOrders('bittrex')
    .then(function(data){
        console.log('Open orders on Bittrex:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });

//-- retrieve open orders from Poloniex
client.openOrders('poloniex')
    .then(function(data){
        console.log('Open orders on Poloniex:')
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
