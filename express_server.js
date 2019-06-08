const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const cookieSession = require('cookie-session')
const app = express();
const bcrypt = require('bcrypt');
const PORT = 8080;
const methodOverride = require('method-override')

function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}
const bodyParser = require("body-parser");
app.use(cookieSession({
    name: 'session',
    keys: ['key'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(morgan("dev"));
app.use(methodOverride("_method"));

// random string generator
function generateRandomString() {
    const charSet =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomNum = () => Math.floor(Math.random() * charSet.length);

    let randomStr = "";

    for (let i = 0; i < 6; i++) {
        randomStr += charSet.charAt(randomNum());
    }
    return randomStr;
}
let urlDatabase = {};
let users = {};
// Load databases 
const loadUsers = () => {
    let buf = new Buffer.alloc(1024);
    fs.open("db/users.backup", "r+", function (err, fd) {
        if (err) {
            return console.error(err);
        }
        fs.read(fd, buf, 0, buf.length, 0, function (err, bytes) {
            if (err) {
                console.log(err);
            }
            let db = buf.slice(0, bytes).toString();
            users = JSON.parse(db);
        });
    });

    setTimeout(function () {
        console.log("### User Database Loaded ###");
    }, 1000);
}
const loadURLs = () => {
    let buf = new Buffer.alloc(1024);
    fs.open("db/database.backup", "r+", function (err, fd) {
        if (err) {
            return console.error(err);
        }
        fs.read(fd, buf, 0, buf.length, 0, function (err, bytes) {
            if (err) {
                console.log(err);
            }
            let db = buf.slice(0, bytes).toString();
            urlDatabase = JSON.parse(db);
        });
    });

    setTimeout(function () {
        console.log("### URL Database Loaded ###");
    }, 1000);
}
loadUsers();
loadURLs();


const backupDatabase = (backupFile, database) => {
    let whichDB = '';
    if (database === users) {
        whichDB = 'User';
    } else {
        whichDB = 'URL';
    }
    fs.writeFileSync(backupFile, JSON.stringify(database), function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("###", whichDB, "Database Backup Complete ###");
    });
};

app.get("/", (req, res) => {
    res.redirect("/urls")
});

app.listen(PORT, () => {
    console.log(`TinyAPP listening on port ${PORT}!`);
});
app.get("/urls/new", (req, res) => {
    let templateVars = {
        user_id: req.session.user_id,
        user: users
    };
    if (templateVars.user_id === undefined) {
        res.status(403);
        res.redirect("/login");
        return;
    }
    res.render("urls_new", templateVars);
});
app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});
app.get("/urls", (req, res) => {
    let templateVars = {
        urls: urlDatabase,
        user_id: req.session.user_id,
        user: users
    };
    res.render("urls_index", templateVars);
});
app.get("/urls/:shortURL", (req, res) => {

    let shortURL = req.params.shortURL;

    let templateVars = {
        shortURL: shortURL,
        longURL: urlDatabase[shortURL].longURL,
        user_id: req.session.user_id,
        user: users,
        info: urlDatabase[shortURL]
    };

    // check if user owns URL
    if (templateVars.user_id != urlDatabase[templateVars.shortURL].userID) {
        res.status(403);
        res.redirect("/urls");
        return;
    }

    if (urlDatabase[templateVars.shortURL]) {
        res.render("urls_show", templateVars);
    } else {
        res.redirect("/");
    }
});
app.get("/u/:shortURL", (req, res) => {
    let shortURL = req.params.shortURL;
    let unique = '';
    const date = new Date();
    if (urlDatabase[shortURL]) {
        // set visitor cookie if it doesnt exist
        if (!req.session.uniqueVisitor) {
            unique = 'UV' + generateRandomString()
            req.session.uniqueVisitor = unique;
        } else {
            unique = req.session.uniqueVisitor;
        }
        // track visitors
        if (urlDatabase[shortURL].uniqueVisitors[unique] === undefined) {
            urlDatabase[shortURL].uniqueVisitors[unique] = [];
            urlDatabase[shortURL].uniqueViews++;

        }
        urlDatabase[shortURL].uniqueVisitors[unique].push(date.toUTCString());

        urlDatabase[shortURL].views++;

        backupDatabase("db/database.backup", urlDatabase);
        res.redirect(urlDatabase[shortURL].longURL);
    } else {
        res.redirect("https://http.cat/404");
    }
});
app.get("/login", (req, res) => {
    let originUrl = "/urls";
    if (req.headers.referrer) {
        originUrl = req.headers.referer;
    }
    if (req.session.user_id) {
        res.redirect("/urls");
        return;
    }

    let templateVars = {
        originUrl: originUrl,
        user_id: req.session.user_id,
        user: users
    };
    res.render("login", templateVars);
});
app.get("/register", (req, res) => {
    if (req.session.user_id) {
        res.redirect("/urls");
        return;
    }
    let templateVars = {
        user_id: req.session.user_id,
        user: users,
        originUrl: req.headers.referer
    };
    res.render("register", templateVars);
});
app.post("/login", (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    let validUser = false;
    let userID = '';
    for (let user in users) {
        if (users[user].email == email && bcrypt.compareSync(password, users[user].password)) {
            userID = user;
            validUser = true;


        }
    }
    if (!validUser) {
        res.status(403).send(
            '<h2>Invalid Email or password!</h2><br><h3> <a href="/login">Go back to login page</a></h3>'
        );
        return;
    }
    req.session.user_id = userID;
    if (!req.body.originUrl) {
        res.redirect("/urls");
    } else {
        let originUrl = req.body.originUrl;
        res.redirect(originUrl);
    }
});
app.post("/register", (req, res) => {
    const userRandomID = "U" + generateRandomString();
    const email = req.body.email;
    const password = hashPassword(req.body.password);
    if (email == "" || password == "") {
        res.status(400).send("Invalid Email or Password");
    }
    for (let user in users) {
        if (users[user].email == email) {
            res.status(400).send('<h2>Email already exists!</h2><br> <a href="/login">Go to login page</a>');
            return;
        }
    }
    users[userRandomID] = {
        id: userRandomID,
        email: email,
        password: password
    };
    backupDatabase("db/users.backup", users);
    req.session.user_id = userRandomID;
    if (!req.body.originUrl) {
        res.redirect("/urls");
    } else {
        let originUrl = req.body.originUrl;
        res.redirect(originUrl);
    }
});
app.post("/urls", (req, res) => {
    let newShort = generateRandomString();
    if (!req.session.user_id) {
        res.status(403).send("User not logged in!");
        return;
    }
    urlDatabase[newShort] = {
        longURL: req.body.longURL,
        userID: req.session.user_id,
        views: 0,
        uniqueViews: 0,
        uniqueVisitors: {}
    };
    backupDatabase("db/database.backup", urlDatabase);
    res.redirect(`urls/${newShort}`);
});
app.put("/urls/:shortURL", (req, res) => {
    const shortURL = req.params.shortURL;
    if (req.session.user_id === undefined) {
        res.status(403);
        res.redirect("/urls");
        return;
    }
    const newLongURL = req.body.longURL;
    urlDatabase[shortURL] = {
        longURL: newLongURL,
        userID: req.session.user_id,
        views: 0,
        uniqueViews: 0,
        uniqueVisitors: []
    }
    backupDatabase("db/database.backup", urlDatabase);
    res.redirect(`/urls/${shortURL}`);
});
app.delete("/urls/:shortURL", (req, res) => {
    const shortURL = req.params.shortURL;
    if (req.session.user_id != urlDatabase[shortURL].userID) {
        res.status(403);
        res.redirect("/urls");
        return;
    }
    delete urlDatabase[shortURL];
    backupDatabase("db/database.backup", urlDatabase);
    res.redirect("/urls");
});
app.post("/login", (req, res) => {
    let user_id = req.body.user_id;
    req.session.user_id = user_id;
    let originUrl = "/urls";
    if (req.headers.referer) {
        originUrl = req.headers.referer;
    }
    res.redirect(originUrl);
});
app.post("/logout", (req, res) => {
    delete (req.session.user_id);
    let originUrl = req.headers.referer;
    res.redirect(originUrl);
});



//catchall route
app.get("*", (req, res) => {
    res.redirect("/");
});
