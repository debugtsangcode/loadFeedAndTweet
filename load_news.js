var request = require("request");
var fs = require('fs');
var async = require("async");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var base64 = require('node-base64-image');
var moment = require('moment');

const urlNewsFeed = "";
const urlDatabase = "mongodb://localhost:27017/db";
var lastKey = null; // Flag for last key acquired

var result = [];

/* ---

    Collect Data From NewsFeed

    1. Load URL, url // OK

    2. Acquire related thumbnail to base64 format // OK

    3. Write to 'news' collection // OK

 */


var imagesDidDownloaded = function(){

    writeNews(urlDatabase);
};

var acquireNewsFeed = function(url){
    request({
        url: url,
        json: true
    }, function (error, response, body) {

        console.log("Load NewsFeed Succeed");

        if (!error && response.statusCode === 200) {

            var aResult = [];
            var i = 0;

            var imageTasks = [];

            for (var k in body){

                var newsItem = body[k];

                newsItem.id = k;

                console.log("ID:" + k + ", " + newsItem.title);
                newsItem.thumbnail_content = "";

                i++;

                lastKey = k;

                /* Digest NewsItem */

                newsItem.image = newsItem.thumbnail;

                newsItem.createDateTime = moment().format();

                newsItem.postDateTime = null;

                /* -- */

                imageTasks.push(newsItem.thumbnail);

                aResult.push(newsItem);

                result = aResult;

            }

            //downloadImages(imageTasks);
            writeNews(urlDatabase);
        }
    });
};


var writeNews = function( aUrlDatabase ){

    var updateCount = 0;
    var database = null;
    MongoClient.connect(aUrlDatabase, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        database = db;

        db.collection('news', function(err, collection) {

            for (var index in result) {

                collection.update({id: result[index].id}, result[index], {upsert:true}, function(err, insertResult) {
                    assert.equal(null, err);
                    //assert.equal(1, result);

                    updateCount++;
                    //console.log("result=" + JSON.stringify(insertResult) + ", " + updateCount);

                    if (updateCount == result.length ){

                        console.log("Close Connection");

                        database.close();

                    }
                });

            }

        });

    });

};

var downloadImages = function (aTasks){
    console.log("[Task Begin] task");
    var finishedTasks = 0;
    var tIndex = 0;
    async.each(imageTasks, function(task, callback){

        var item = result[tIndex];

        var options = {string: true, item: item};

        base64.base64encoder( task , options, function (err, image) {
            if (err) { console.log(err); }

            options.item.thumbnail_content = image;
            //console.log("[Task finish] task" + JSON.stringify(options.item));

            finishedTasks++;

            console.log("task "+finishedTasks);
            if (finishedTasks == imageTasks.length){
                imagesDidDownloaded();
            }

        });

        tIndex++;

    }, function(err){
        // if any of the file processing produced an error, err would equal that error
        if( err ) {
            // One of the iterations produced an error.
            // All processing will now stop.
            console.log('A file failed to process');
        } else {
            console.log('All files have been processed successfully');
        }
    });
};

/* - Main */
var main = function(){

    result = acquireNewsFeed(urlNewsFeed);

};

main();
