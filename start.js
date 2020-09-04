// =================== //
// PROGRAM ENTRY POINT //
// =================== //

//#region Notes
// To start, maneuver to directory with start.js
// In console type 'node start.js'
//#endregion

// import required packages
var express = require("express"); // for web server
var axios = require("axios"); // a promised base http client (api calls)
var bodyParser = require("body-parser"); // receive json data

// setup express web server
var app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname + "/assets/html")); // location of html files...this is unfamiliar look into it

// setup server to listen to port 3000
app.set("port", 3000);
var server = app.listen(app.get("port"), function(){
    console.log("Server listening on port " + server.address().port);
});