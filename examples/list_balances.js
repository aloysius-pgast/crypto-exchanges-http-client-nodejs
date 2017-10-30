"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

/*
 NB: following will only work if you have configured key & secret on gateway
 */

console.log("Listing balances on Bittrex...")

client.balances('bittrex')
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
