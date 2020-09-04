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

// hide vulnerable authetication information in a .env file using dotenv | npm install dotenv --save
require("dotenv")

// setup express web server
var app = express();
app.use(bodyParser.json());

// 'static' files are not part of the url, so you can have express look for files on your computer/server
// app.use(express.static(__dirname + "/assets/html")); // location of folder with html files...this is unfamiliar look into it
// app.use(express.static(__dirname + "/assets/css"));
app.use(express.static("public")); // html entry point in 'public' root

// setup server to listen to port 3000
app.set("port", 3000);
var server = app.listen(app.get("port"), function(){
    console.log("Server listening on port " + server.address().port);
});

// =================================== //
// THIS TO BECOME A ROUTES FOLDER/FILE //
// =================================== //

// ============ //
// 2 STEP OAUTH //
// ============ //
var FORGE_CLIENT_ID = process.env.FORGE_CLIENT_ID;
var FORGE_CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET;

var accessToken = "";
var scopes = "data:read data:write data:create bucket:create bucket:read"; // not sure what this is, is it forge specific?
const queryStr = require("querystring");

// ======================= //
// ROUTES - manual example //
// ======================= //

// oauth api routes
app.get("/api/forge/oauth", function(req, res) {
    axios({
        method: "POST",
        url: "https://developer.api.autodesk.com/authentication/v2/authenticate",
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        data: queryStr.stringify({
            client_id: FORGE_CLIENT_ID,
            client_secret: FORGE_CLIENT_SECRET,
            grant_type: "client_credentials",
            scope: scopes
        })
    }).then(function(response) {
        // success
        accessToken = response.data.accessToken;
        console.log(response);
        res.redirect("/api/forge/datamanagement/bucket/create");
    }).catch(function(error) {
        // failed
        console.log(error);
        res.send("Failed to authenticate")
    });
});