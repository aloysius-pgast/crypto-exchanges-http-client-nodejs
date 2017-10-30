"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

console.log("Searching all trading pairs having ETH as base currency...")

client.findPair('ETH', 'baseCurrency')
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
