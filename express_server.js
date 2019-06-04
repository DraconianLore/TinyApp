var express = require("express");
var app = express();
var PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

var urlDatabase = {
    "b2xVn2": "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
};

app.get("/", function(req, res) {
    res.send("Hello!");
});

app.listen(PORT, () => {
    console.log(`TinyAPP listening on port ${PORT}!`);
});
app.get("/urls/new", (req, res) => {
    res.render("urls_new");
});
app.get("/urls.json", function(req, res) {
    res.json(urlDatabase);
})
app.get("/urls", function(req, res) {
    let templateVars = { urls: urlDatabase };
    res.render("urls_index", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
    let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase };
    res.render("urls_show", templateVars);
});

app.get("/hello", function(req, res) {
    res.send("<html><body>Hello <b>World</b></body></html>\n");
});
app.post("/urls", (req, res) => {
    console.log(req.body); // Log the POST request body to the console
    res.send("Ok"); // Respond with 'Ok' (we will replace this)
});

function generateRandomString() {

}