/**
 * This is a simple Alexa Skill to return deals-of-the-day from various daily deal merchants
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask [App Name] for the meh."
 *  Alexa: "..."
 */


var APP_ID = process.env.APP_ID || "";
var APP_NAME = process.env.APP_NAME_US || "Bargain Buddy";

var MEH_BASE_URL = "https://api.meh.com/1/current.json?apikey=";
var MEH_API_KEY = process.env.MEH_API_KEY || "";

var VI_APP_TOKEN = process.env.VI_TOKEN || "";

var WOOT_BASE_URL = "https://api.woot.com/2/events.json";
var WOOT_API_KEY = process.env.WOOT_API_KEY || "";
var WOOT_SELECT = "offers.title,offers.items,offers.soldout";

var SUPPORTED_MERCHANTS = [
    "Woot",
    "Meh",
    "Home Woot",
    "Electronics Woot",
    "Computers Woot",
    "Tools Woot",
    "Sport Woot",
    "Accessories Woot",
    "Kids Woot",
    "Sellout Woot",
    "Wine Woot",
    "Shirt Woot"
];

var https = require('https');
var VoiceLabs = require('voicelabs')(VI_APP_TOKEN);

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

var MyApp = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MyApp.prototype = Object.create(AlexaSkill.prototype);
MyApp.prototype.constructor = MyApp;

MyApp.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MyApp onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MyApp.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MyApp onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    response.ask("What daily deal would you like me to look up? Try saying \"tell me the Home Woot\" or \"tell me today’s Meh deal\".", "Say something like 'the Woot deal', or say 'help' for a list of available daily deal merchants.");
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
MyApp.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("MyApp onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

MyApp.prototype.intentHandlers = {
    "GetMehIntent": function (intent, session, response) {
        VoiceLabs.track(session, intent.name, null, null, (error, res) => {
            handleMehRequest(response);
        });
    },

    "GetWootIntent": function (intent, session, response) {
        var serviceSlot = intent.slots.Service;
        VoiceLabs.track(session, intent.name, (serviceSlot && serviceSlot.value ? serviceSlot.value : null), null, (error, res) => {
            handleWootRequest((serviceSlot && serviceSlot.value ? serviceSlot.value : null), response);
        });
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        VoiceLabs.track(session, intent.name, null, null, (error, res) => {
            var speakMerchants = arrayToReadableString(SUPPORTED_MERCHANTS, ", ", ", and ");
            response.ask("I can tell you the current deal from " + speakMerchants + ". Which would you like?");
        });
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        VoiceLabs.track(session, intent.name, null, null, (error, res) => {
            response.tell("O.K.");
        });
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        VoiceLabs.track(session, intent.name, null, null, (error, res) => {
            response.tell("O.K.");
        });
    }
};

// arrayToReadableString([item1,item2], ", ", " and ")
function arrayToReadableString(array, join, finalJoin) {
	var arr = array.slice(0),
		last = arr.pop();
	join = join || ', ';
	finalJoin = finalJoin || ' and ';
	return arr.join(join) + finalJoin + last;
};

/**
 * Gets the current meh.com deal and returns to the user.
 */
function handleMehRequest(response) {
    getMehText(function(err, result){
        response.tellWithCard(result, APP_NAME, result);
    });
}

function getMehText(callback){
    https.get(MEH_BASE_URL + MEH_API_KEY, function(res) {
        var body = "";
        var speakText = "";

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            try{
                var result = JSON.parse(body);

                // check for single item or multiple items
                if(result.deal.items.length > 1){
                    var minPrice = null;
                    var maxPrice = 0;
                    for(var i = 0; i < result.deal.items.length; i++){
                        if(result.deal.items[i].price < minPrice || minPrice == null) minPrice = result.deal.items[i].price;
                        if(result.deal.items[i].price > maxPrice) maxPrice = result.deal.items[i].price;
                    }
                    speakText = "Today's Meh deal is a choice of " + result.deal.title + " starting at $" + minPrice;
                }else{
                    speakText = "Today's Meh deal is a " + result.deal.title + " for $" + result.deal.items[0].price;
                }

                callback(null, speakText);
            }catch(e){
                speakText = "Sorry, I got an unexpected response from Meh. Please try again later.";
                callback(e, speakText);
            }
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
        speakText = "Sorry, I was unable to reach Meh. Please try again later.";
        callback(e, speakText);
    });
}

function handleWootRequest(service, response) {
    getWootText(service, function(err, result){
        response.tellWithCard(result, APP_NAME, result);
    });
}

function getWootText(service, callback){
    var spokenType;
    var type;
    switch(service){
        case "home":
            spokenType = "Home Woot";
            type = "home.woot.com";
            break;
        case "electronics":
        case "electronic":
            spokenType = "Electronics Woot";
            type = "electronics.woot.com";
            break;
        case "computers":
        case "computer":
            spokenType = "Computers Woot";
            type = "computers.woot.com";
            break;
        case "tools":
        case "tool":
        case "tool and garden":
        case "tools and garden":
            spokenType = "Tools Woot";
            type = "tools.woot.com";
            break;
        case "sports":
        case "sport":
            spokenType = "Sport Woot";
            type = "sport.woot.com";
            break;
        case "accessories":
        case "accessory":
            spokenType = "Accessories Woot";
            type = "accessories.woot.com";
            break;
        case "kids":
        case "kid":
            spokenType = "Kids Woot";
            type = "kids.woot.com";
            break;
        case "shirts":
        case "shirt":
            spokenType = "Shirt Woot";
            type = "shirt.woot.com";
            break;
        case "wines":
        case "wine":
            spokenType = "Wine Woot";
            type = "wine.woot.com";
            break;
        case "sellouts":
        case "sell outs":
        case "sellout":
        case "sell out":
            spokenType = "Sellout Woot";
            type = "sellout.woot.com";
            break;
        default:
            spokenType = "Woot";
            type = "www.woot.com";
    }

    https.get(WOOT_BASE_URL + "?select=offers.title,offers.items,offers.soldout&key=" + WOOT_API_KEY + "&site=" + type + "&eventType=daily", function(res) {
        var body = "";
        var speakText = "";

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            try{
                var result = JSON.parse(body);

                if(result.length && result[0].Offers.length){

                    // check for single item or multiple items
                    if(result[0].Offers[0].Items.length > 1){
                        var minPrice = null;
                        var maxPrice = 0;
                        for(var i = 0; i < result[0].Offers[0].Items.length; i++){
                            if(result[0].Offers[0].Items[i].SalePrice < minPrice || minPrice == null) minPrice = result[0].Offers[0].Items[i].SalePrice;
                            if(result[0].Offers[0].Items[i].SalePrice > maxPrice) maxPrice = result[0].Offers[0].Items[i].SalePrice;
                        }

                        if(result[0].Offers[0].SoldOut){
                            speakText = "Today's " + spokenType + " is sold out. It was a choice of " + result[0].Offers[0].Title + " starting at $" + minPrice;
                        }else{
                            speakText = "Today's " + spokenType + " deal is a choice of " + result[0].Offers[0].Title + " starting at $" + minPrice;
                        }
                    }else{
                        if(result[0].Offers[0].SoldOut){
                            speakText = "Today's " + spokenType + " is sold out. It was " + (type == "shirt.woot.com" ? "called " : "a ") + result[0].Offers[0].Title + " for $" + result[0].Offers[0].Items[0].SalePrice;
                        }else{
                            speakText = "Today's " + spokenType + " deal is " + (type == "shirt.woot.com" ? "called " : "a ") + result[0].Offers[0].Title + " for $" + result[0].Offers[0].Items[0].SalePrice;
                        }
                    }
                }else{
                    speakText = "It's a " + spokenType + "-off!";
                }

                callback(null, speakText);
            }catch(e){
                speakText = "Sorry, I got an unexpected response from " + spokenType + ". Please try again later.";
                callback(e, speakText);
            }
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
        speakText = "Sorry, I was unable to reach " + spokenType + ". Please try again later.";
        callback(e, speakText);
    });
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the MyApp skill.
    var skill = new MyApp();
    skill.execute(event, context);
};
