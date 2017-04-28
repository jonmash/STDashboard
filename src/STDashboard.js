var config = require('./config.js');
var request = require('request');
var express = require('express');
var OAuth = require('oauth'), OAuth2 = OAuth.OAuth2;

app = express();

if(!("bearer" in config.oauth) || config.oauth.bearer === "") {
    var endpoints_uri = config.oauth.serverSite + '/api/smartapps/endpoints';

    var oauth2 = new OAuth2(
            config.oauth.clientID,
            config.oauth.clientSecret,
            config.oauth.serverSite, 
            '/oauth/authorize',
            '/oauth/token', 
            null
        );
     
    // Authorization uri definition 
    var authorization_uri = oauth2.getAuthorizeUrl({
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'app',
        state: '3(#0/!~5467',
        response_type: 'code'
    });


    // Initial page redirecting to Github 
    app.get('/auth', function (req, res) {
        res.redirect(authorization_uri);
    });
     
    // Callback service parsing the authorization token and asking for the access token 
    app.get('/callback', function (req, res) {
        var code = req.query.code;
        console.log('/callback got code ' + code);
        oauth2.getOAuthAccessToken(code,
            {code: code, redirect_uri: 'http://localhost:3000/callback', grant_type: 'authorization_code'},
            saveToken);

        function saveToken(e, access_token, refresh_token, results) {
            if (e) {
                console.log('Access Token Error ', e, e.message); 
                console.log('Results Error ', results, access_token); 
                res.end(e.data);
                return;
            } else if (results.error) {
                console.log(results);
                res.end(JSON.stringify(results));
                return;
            }

            // access_token is the token, get the endpoint
            var bearer = access_token;
            var sendreq = { method: "GET", uri: endpoints_uri + "?access_token=" + access_token };
            request(sendreq, function (err, res1, body) {
                var endpoints = JSON.parse(body);
                // we just show the final access URL and Bearer code
                var access_url = endpoints[0].uri;
                res.send('<pre>' + access_url + '</pre><br><pre>Bearer ' + bearer + '</pre><br /><pre>' + body + '</pre>');
            });
        }
    });

    app.get('/', function (req, res) {
        res.send('<a href="/auth">Connect with SmartThings</a>');
    });

    app.listen(3000);

    console.log('Bearer not defined, starting config server on localhost:3000');
} else {
    app.get('/', function (req, res) {
        var request_options = {
            uri: config.oauth.endpoint+'/list',
            headers: { Authorization: 'Bearer '+ config.oauth.bearer }
        };
        request(request_options, function (err, res1, body) {
            //var parsedBody = JSON.parse(body);
            res.send('<pre>' + body + '</pre>');
        });
    });
    app.get('/:id/:cmd', function (req, res) {
        if(['on', 'off'].indexOf(req.params.cmd) < 0) {
            res.status(400)
               .send('Invalid Command: ' + req.params.cmd);
            return;
        }
        var request_options = {
            method: 'GET',
            uri: config.oauth.endpoint+'/cmd/' + req.params.id + '/' + req.params.cmd,
            headers: { Authorization: 'Bearer '+ config.oauth.bearer }
        };
        request(request_options, function (err, res1, body) {
            //var parsedBody = JSON.parse(body);
            res.send('<pre>' + body + '</pre>');
        });
    });
    
    app.listen(3000);
    console.log('Bearer defined, assuming valid. Starting server on localhost:3000');
}