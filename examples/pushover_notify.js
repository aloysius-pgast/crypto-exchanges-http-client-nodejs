"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

/*
 NB: following will only work if you have configured Push Over user & token
 */

console.log("Sending Push Over notification...")

client.pushOverNotify('Hi !')
    .then(function(data){
        console.log(data);
    }).catch (function(err){
        console.log(err);
    });
