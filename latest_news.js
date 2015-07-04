/**
 * Created by Calvin Tsang on 1/7/15.
 *
 * Show and tweet
 */
var request = require("request");
var fs = require('fs');
var async = require("async");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var base64 = require('node-base64-image');
var moment = require('moment');
var Twitter = require('twitter');

var client = new Twitter({
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
});

const urlDatabase = "mongodb://localhost:27017/db";
const K_DEFAULT_LIMIT = 4;

var newsItems = [];

var myDb = null;

var params = {};


var mongoToArray = function(err, items){

    var content = "";
    newsItems = items;

    for (var i = 0; i < items.length; i++){
        //console.log(JSON.stringify(items[i]));

        content = content + "\n\n\n" + items[i].id + "\n" + items[i].title + "\n" + items[i].author + "|" + items[i].ts + "\n" + items[i].url + "\n" + items[i].thumbnail + "\n" +
            items[i].createDateTime +  " | "+ items[i].postDateTime  ;
    }

    displayContent(content);

};

var showNews = function( aLimit){
    console.log("showNews: Connect to Database");
    MongoClient.connect(urlDatabase, function (err, db) {
        assert.equal(null, err);

        myDb = db;

        var collection = db.collection('news');

        if (aLimit == null){

            collection.find().limit(K_DEFAULT_LIMIT).sort({ id:1}).toArray( mongoToArray);

        }else{

            collection.find().limit(aLimit).sort({ id:1}).toArray( mongoToArray);

        }

    });
};

var displayContent = function(html){

    console.log("Show Content----------");
    console.log(html);
    console.log("----------");


    myDb.close();
    console.log("Close database connection");

    for ( var j in newsItems){
        var item = newsItems[j];
        if (params.isTweet == true && item.postDateTime == null) {

            var aMessage = "";

            aMessage = item.title + "\n"  + item.author + "|" + item.ts +  "\n" + item.url;

            tweetStatus(item, aMessage);
        }
    }

};

var tweetStatus = function(newsItem, message){
    console.log("Tweet Status () : newsItem=" + JSON.stringify(newsItem) + ", message=" + message);
    client.post('statuses/update', {status: message}, function(error, tweet, response){
        //console.log("response=" + response);
        if (!error) {
            console.log("Tweeted: " + JSON.stringify(tweet));

            var updateCount = 0;
            var database = null;
            MongoClient.connect(urlDatabase, function (err, db) {
                assert.equal(null, err);
                console.log("Connected correctly to server");
                database = db;

                db.collection('news', function(err, collection) {

                        newsItem.postDateTime = moment().format();

                        collection.update({id: newsItem.id}, newsItem, {upsert:true}, function(err, insertResult) {
                            assert.equal(null, err);
                            //assert.equal(1, result);
                            console.log("result=" + JSON.stringify(insertResult) + ", " + updateCount);

                            console.log("Close Connection");

                            database.close();
                        });

                });

            });
        }
    });

}


var parseParameters = function(limit, isTweet){

    isTweet = Boolean(isTweet);

    if (isTweet !== true){
        isTweet = false;
    }

    if (limit != null) {
        limit = parseInt(limit);
    }else {
        limit = K_DEFAULT_LIMIT;
    }
    //console.log(JSON.stringify(limit + ", " + isTweet));
    return { "limit" : limit, "isTweet" : isTweet};
};


/* - Main */
var main = function(){

    params = parseParameters(process.argv[2], process.argv[3]); // {limit: 5, isTweet: false}

    showNews(params.limit);

};


main();