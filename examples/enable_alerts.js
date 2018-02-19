"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

client.enableAlerts(true, [1,2,3]).then(function(data){
    console.log(data);
}).catch(function(err){
    console.log(err);
});
