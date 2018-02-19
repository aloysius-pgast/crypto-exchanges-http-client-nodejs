"use strict";
const HttpClient = require('../lib/client');
const baseUri = 'http://127.0.0.1:8000';
const client = new HttpClient(baseUri);

client.alerts().then(function(list){
    if (0 == list.length)
    {
        console.log(`Found no alert`);
        return;
    }
    console.log(`Found ${list.length} alert(s) :`);
    for (var i = 0; i < list.length; ++i)
    {
        let date = new Date(list[i].status.timestamp * 1000);
        console.log(`- ${list[i].name} : ${list[i].conditions.length} condition(s), ${list[i].status.value} since ${date.toLocaleString()}`);
    }
}).catch (function(err){
    console.log(err);
});
