var express = require("express");
var app = express();
var PORT = 8080; // default port 8080

app.set("view engine", "ejs");

var urlDatabase = {
    "b2xVn2": "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
};

app.get("/", function(req, res) {
    res.send("Hello!");
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}!`);
});

app.get("/urls.json", function(req, res) {
    res.json(urlDatabase);
})
app.get("/urls", function(req, res) {
    let templateVars = { urls: urlDatabase };
    res.render("urls_index", templateVars);
});

app.get("/hello", function(req, res) {
    res.send("<html><body>Hello <b>World</b></body></html>\n");
});