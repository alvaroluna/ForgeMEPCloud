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

// Route - oauth api - triggered after user clicks the main button in index.html 
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
        console.log(error);
        res.send("Failed to authenticate")
    });
});

// Route - read-only access token
app.get("/api/forge/oauth/public", function(req, res) {
    // limit public token to viewer read only
    axios({
        method: "POST",
        url: "https://developer.api.autodesk.com/authentication/v1/authenticate",
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        data: queryStr.stringify({
            client_id: FORGE_CLIENT_ID,
            client_secret: FORGE_CLIENT_SECRET,
            grant_type: "client_credentials",
            scope: "viewables:read"
        })
    }).then(function(response) {
        // success
        console.log(response);
        res.json({access_token: response.data.access_token, expires_on: response.data.expires_in});
    }).catch(function(error) {
        // failed
        console.log(error);
        res.status(500).json(error);
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
        console.log(access_token);
        res.redirect("/html/upload.html"); // assume it is looking for the public folder, bc that is the static directory
    }).catch(function(error) {
        // failed
        console.log(error);
        res.send("Failed to verify the new bucket");
    });
});

// save file - converting the source into a Base64-encoded string
var Buffer = require("buffer").Buffer;
String.prototype.toBase64 = function() {
    // buffer is part of node.js to enable the interaction with octet streams
    // in TCP streams, file system operations, and other contexts
    return new Buffer(this).toString("base64");
};

var multer = require("multer"); // used to handle file upload
var upload = multer({dest: "tmp/"}); // save file to the local /tmp folder

// Route - save file - this is post bc we are saving data; others are getting info about data that is put through axios in the same operation
app.post("/api/forge/datamanagement/bucket/upload", upload.single("fileToUpload"), function(req, res) {
    
    var fs = require("fs"); // node.js file system for reading files
    
    fs.readFile(req.file.path, function(err, filecontent) {
        axios({
            method: "PUT",
            url: "https://developer.api.autodesk.com/oss/v2/buckets/" + encodeURIComponent(bucketKey) + "/objects/" + encodeURIComponent(req.file.originalname),
            headers: {
                Authorization: "Bearer " + access_token,
                "Content-Disposition": req.file.originalname,
                "Content-Length": filecontent.length
            },
            data: filecontent
        }).then(function(response) {
            // success 
            console.log(response);
            var urn = response.data.objectId.toBase64();
            console.log(urn);
            res.redirect("/api/forge/modelderivative/" + urn);
        }).catch(function(error) {
            // failed
            console.log(error);
            res.send("Failed to create a new object in the bucket")
        });
    });
});

// Route - translation uploaded file to svf format
app.get("/api/forge/modelderivative/:urn", function(req, res) {
    var urn = req.params.urn;
    var format_type = "svf";
    var format_views = ["2d", "3d"];

    axios({
        method: "POST",
        url: "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
        headers: {
            "content-type": "application/json",
            Authorization: "Bearer " + access_token
        },
        data: JSON.stringify({
            "input": {
                "urn": urn
            },
            "output": {
                "formats": [
                    {
                        "type": format_type,
                        "views": format_views
                    }
                ]
            }
        })
    }).then(function(response) {
        // success
        console.log(response);
        res.redirect("/html/viewer.html?urn=" + urn);
    }).catch(function(error) {
        // failed
        console.log(error);
        res.send("Error at Model Derivative job")
    });
});