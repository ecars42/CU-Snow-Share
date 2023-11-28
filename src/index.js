// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);



// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
//test for lab 11
app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});

app.get("/home", (req, res) => {
    res.redirect("/login"); //this will call the /anotherRoute route in the API
  });

app.get("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register")
});

// Register API
app.post("/register", async (req, res) => {
  try {
    // Check if both username and password are provided
    if (!req.body.username || !req.body.password || !req.body.name || !req.body.email) {
      return res.status(200).json({ message: 'Invalid registration.' });
    }

    // Hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);

    // Insert username, hashed password, name, and email into the 'students' table
    await db.none(
      "INSERT INTO students(username, password, name, email) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
      [req.body.username, hash, req.body.name, req.body.email]
    );

    console.log('Registration successful.');
    res.status(200).json({ message: 'Registration successful.' });
  } catch (error) {
    console.error('Error: ', error);
    res.status(200).json({ message: 'Invalid registration.' });
  }
});




// Login API
app.post("/login", async (req, res) => {
  try {
    // Check if the username exists in the students table
    const student_query = 'SELECT * FROM students WHERE username = $1';
    const student_match = await db.any(student_query, [req.body.username]);

    if (student_match.length === 0) {
      // Student not found, return an error response
      res.status(200).json({ status: 'error', message: 'Incorrect username or password' });
    } else {
      const match_pass = await bcrypt.compare(req.body.password, student_match[0].password);

      if (!match_pass) {
        // Incorrect password, return an error response
        res.status(200).json({ status: 'error', message: 'Incorrect username or password.' });
      } else {
        // Successful login, return a success response
        res.status(200).json({ status: 'success', message: 'User login successful' });
      }
    }
  } catch (error) {
    // Log the error
    console.log('error: ', error);

    // Internal server error, return an error response
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


app.get("/about", (req, res) => {
  res.render("pages/about")
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", {message: "Logged out Successfully"});
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');
