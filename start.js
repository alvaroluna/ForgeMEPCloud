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
require("dotenv").config();

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

// Oauth variables, also used partially for bucket
var FORGE_CLIENT_ID = process.env.FORGE_CLIENT_ID;
var FORGE_CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET;

var access_token = "";
var scopes = "data:read data:write data:create bucket:create bucket:read"; // not sure what this is, is it forge specific?
const queryStr = require("querystring");

// ========================================================= //
// ROUTES - app api routes that call forge api's using axios //
// ========================================================= //

// Route - oauth api
app.get("/api/forge/oauth", function(req, res) {
    // request body and header data requirements is found in
    // the forge api documentation for each module/api
    
    axios({
        method: "POST",
        url: "https://developer.api.autodesk.com/authentication/v1/authenticate",
        headers: {
            "content-type": "application/x-www-form-urlencoded",
        },
        data: queryStr.stringify({
            client_id: FORGE_CLIENT_ID,
            client_secret: FORGE_CLIENT_SECRET,
            grant_type: "client_credentials",
            scope: scopes
        })
    }).then(function(response) {
        // success
        access_token = response.data.access_token;
        console.log(response);
        res.redirect("/api/forge/datamanagement/bucket/create"); // api call sends app to this address
    }).catch(function(error) {
        // failed
        // console.log(error);
        res.send("Failed to authenticate")
    });
});

// Bucket - location within autodesk servers to save app data
// Bucket variables
const bucketKey = FORGE_CLIENT_ID.toLowerCase() + "mep_bucket"; // Prefix with your ID so the bucket key is unique across all buckets on all other accounts
const policyKey = 'transient'; // expires in 24hrs

// Route - bucket creation
app.get("/api/forge/datamanagement/bucket/create", function(req, res) {
    // create an application shared bucket using access token from previous route
    // this bucket will be used for storing all files in this app

    axios({
        method: "POST",
        url: "https://developer.api.autodesk.com/oss/v2/buckets",
        headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + access_token
        },
        data: JSON.stringify({
            "bucketKey": bucketKey,
            "policyKey": policyKey
        })
    }).then(function(response) {
        // success
        console.log(response);
        res.redirect("/api/forge/datamanagement/bucket/detail");
    }).catch(function(error) {
        // catch when a bucket already exists
        if(error.response && error.response.status == 409) {
            console.log("Bucket already exists, skip creation");
            res.redirect("/api/forge/datamanagement/bucket/detail");
        }
        // failed
        console.log(error);
        res.send("Failed to create a new bucket");
    });
});

// Route - bucket detail
app.get("/api/forge/datamanagement/bucket/detail", function(req, res) {
    axios({
        method: "GET",
        url: "https://developer.api.autodesk.com/oss/v2/buckets/" + encodeURIComponent(bucketKey) + "/details",
        headers: {
            Authorization: "Bearer " + access_token
        }
    }).then(function(response) {
        // success
        console.log(response);
        res.redirect("upload.html"); // this is the html that has been created for the app
    }).catch(function(error) {
        // failed
        console.log(error);
        res.send("Failed to verify the new bucket");
    });
});