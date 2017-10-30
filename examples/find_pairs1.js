"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

console.log("Searching all trading pairs having NEO as currency...")

client.findPair('NEO', 'currency')
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
