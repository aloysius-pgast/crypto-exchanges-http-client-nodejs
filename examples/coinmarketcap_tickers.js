"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

console.log("Top 5 currencies on CoinMarketCap...")

client.coinMarketCapTickers({limit:5})
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
