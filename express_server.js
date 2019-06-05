var fs = require("fs");
var express = require("express");
var app = express();
var PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

function generateRandomString() {
    let charSet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let randomNum = () =>
        Math.floor(Math.random() * charSet.length);

    let randomStr = ""

    for (let i = 0; i < 6; i++) {
        randomStr += charSet.charAt(randomNum());
    }
    return randomStr;

}
let urlDatabase = {};
var buf = new Buffer.alloc(1024);

fs.open('./database.backup', 'r+', function(err, fd) {
    if (err) {
        return console.error(err);
    }
    fs.read(fd, buf, 0, buf.length, 0, function(err, bytes) {
        if (err) {
            console.log(err);
        }
        let db = (buf.slice(0, bytes).toString());
        urlDatabase = JSON.parse(db);
    });
});
setTimeout(function() {
    console.log("Database Loaded")
}, 1000);

const backupDatabase = () => {
    fs.writeFile('database.backup', JSON.stringify(urlDatabase), function(err) {
        if (err) {
            return console.error(err);
        }
    })
};
// {
//     "b2xVn2": "http://www.lighthouselabs.ca",
//     "9sm5xK": "http://www.google.com"
// };

app.get("/", (req, res) => {
    res.send("Hello!");
});

app.listen(PORT, () => {
    console.log(`TinyAPP listening on port ${PORT}!`);
});
app.get("/urls/new", (req, res) => {
    res.render("urls_new");
});
app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});
app.get("/urls", (req, res) => {
    let templateVars = { urls: urlDatabase };
    res.render("urls_index", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
    let templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase };
    res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
    let shortURL = req.params.shortURL;
    if (urlDatabase[shortURL]) {
        res.redirect(urlDatabase[shortURL]);
    } else {
        res.redirect('https://http.cat/404');
    }

});
app.post("/urls", (req, res) => {
    console.log(req.body.longURL); // Log the POST request body to the console
    let newShort = generateRandomString();
    urlDatabase[newShort] = req.body.longURL;
    backupDatabase();
    console.log("Database Backup Complete");
    res.redirect(`urls/${newShort}`);
});