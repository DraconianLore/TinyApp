const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const app = express();

const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(morgan("dev"));

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
const users = {
    userRandomID: {
        id: "userRandomID",
        email: "user@example.com",
        password: "purple-monkey-dinosaur"
    },
    user2RandomID: {
        id: "user2RandomID",
        email: "user2@example.com",
        password: "dishwasher-funk"
    }
};
let buf = new Buffer.alloc(1024);

fs.open("./database.backup", "r+", function (err, fd) {
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
    console.log("### Database Loaded ###");
}, 1000);

const backupDatabase = () => {
    fs.writeFile("database.backup", JSON.stringify(urlDatabase), function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("### Database Backup Complete ###");
    });
};
// {        -- old hard-coded DB --
//     "b2xVn2": "http://www.lighthouselabs.ca",
//     "9sm5xK": "http://www.google.com"
// };

app.get("/", (req, res) => {
    res.send("ERROR: Page not found!");
});

app.listen(PORT, () => {
    console.log(`TinyAPP listening on port ${PORT}!`);
});
app.get("/urls/new", (req, res) => {
    let templateVars = {
        user_id: req.cookies["user_id"],
        user: users
    };
    res.render("urls_new", templateVars);
});
app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});
app.get("/urls", (req, res) => {
    let templateVars = {
        urls: urlDatabase,
        user_id: req.cookies["user_id"],
        user: users
    };
    res.render("urls_index", templateVars);
});
app.get("/urls/:shortURL", (req, res) => {
    let templateVars = {
        shortURL: req.params.shortURL,
        longURL: urlDatabase,
        user_id: req.cookies["user_id"],
        user: users
    };
    if (urlDatabase[templateVars.shortURL]) {
        res.render("urls_show", templateVars);
    } else {
        res.redirect("/");
    }
});
app.get("/u/:shortURL", (req, res) => {
    let shortURL = req.params.shortURL;
    if (urlDatabase[shortURL]) {
        res.redirect(urlDatabase[shortURL]);
    } else {
        res.redirect("https://http.cat/404");
    }
});
app.get("/login", (req, res) => {
    let templateVars = {
        originUrl: req.headers.referer,
        user_id: req.cookies["user_id"],
        user: users
    };
    res.render("login", templateVars);
});
app.get("/register", (req, res) => {
    let templateVars = {
        user_id: req.cookies["user_id"],
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
        if (users[user].email == email && users[user].password == password) {
            userID = user;
            validUser = true;
        }
    }
    if (!validUser){
        res.status(403).send(
            '<h2>Invalid Email or password!</h2><br> <a href="/login">Go to login page</a>'
        );
    };
    res.cookie("user_id", userID);
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
    const password = req.body.password;
    if (email == "" || password == "") {
        res.status(400).send("Invalid Email or Password");
    }
    for (let user in users) {
        if (users[user].email == email) {
            res
                .status(400)
                .send(
                    '<h2>Email already exists!</h2><br> <a href="/login">Go to login page</a>'
                );
        }
    }
    users[userRandomID] = {
        id: userRandomID,
        email: email,
        password: password
    };
    res.cookie("user_id", userRandomID);
    if (!req.body.originUrl) {
        res.redirect("/urls");
    } else {
        let originUrl = req.body.originUrl;
        res.redirect(originUrl);
    }
});
app.post("/urls", (req, res) => {
    let newShort = generateRandomString();
    urlDatabase[newShort] = req.body.longURL;
    backupDatabase();
    res.redirect(`urls/${newShort}`);
});
app.post("/urls/:shortURL", (req, res) => {
    const shortURL = req.params.shortURL;
    const newLongURL = req.body.longURL;
    urlDatabase[shortURL] = newLongURL;
    backupDatabase();
    res.redirect(`/urls/${shortURL}`);
});
app.post("/urls/:shortURL/delete", (req, res) => {
    const shortURL = req.params.shortURL;
    delete urlDatabase[shortURL];
    backupDatabase();
    res.redirect("/urls");
});
app.post("/login", (req, res) => {
    let user_id = req.body.user_id;
    res.cookie("user_id", user_id);
    let originUrl = req.headers.referer;
    res.redirect(originUrl);
});
app.post("/logout", (req, res) => {
    res.clearCookie("user_id");
    let originUrl = req.headers.referer;
    res.redirect(originUrl);
});

//catchall route
app.get("*", (req, res) => {
    res.redirect("/");
});
