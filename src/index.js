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
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static('resources'));



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
    // Check if both username, password, name, and email are provided
    if (!req.body.username || !req.body.password || !req.body.name || !req.body.email) {
      res.render("pages/register", {message: "Invalid registration."});
      return; // Exit the function to avoid further execution
    }

    // Hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);
    console.log(hash);

    // Insert username, hashed password, name, and email into the 'students' table
    await db.none(
      "INSERT INTO students(username, name, email, password) VALUES ($1, $2, $3, $4)",
      [req.body.username, req.body.name, req.body.email, hash]
    );

    // Insert other user details into the 'tags' table (adjust as needed)
    await db.none(
      "INSERT INTO tags(ski_or_board, username, mtn_name, skill_level) VALUES ($1, $2, $3, $4)",
      [req.body.ski_or_board, req.body.username, req.body.mtn_name, parseInt(req.body.skill_level)]
    );

    res.render("pages/login", {message: "Registration successful."});
 
  } catch (error) {
    console.log('error: ', error);
    res.redirect("pages/login");
  }
});

app.post("/login", async (req, res) => {
  try {
    // Check if the username exists in the students table
    const student_query = 'SELECT * FROM students WHERE username = $1';
    const student_match = await db.any(student_query, [req.body.username]);
    var pass = '';

    if (student_match.length === 0) {
      // Student not found, return an error response
      res.render("pages/login", {message: "Incorrect username or password."});
    } else {
      if(student_match[0].password.startsWith("$2a")) 
      {
        pass = student_match[0].password
      }
      else {
        pass = await bcrypt.hash(student_match[0].password, 10);
      }
      console.log(pass);
      // Compare entered password with hashed password from the database
      const passwordMatch = await bcrypt.compare(req.body.password, pass);

      if (!passwordMatch) {
        // Incorrect password, return an error response
        res.render("pages/login", {message: "Incorrect username or password."});
      } else {
        // Fetch the user's attributes from the 'tags' table. This is what will be used in discover.
        const tags_query = 
        `SELECT tags.*, students.name, students.email
        FROM tags
        JOIN students ON tags.username = students.username
        WHERE tags.username = $1`;
        const tags_info = await db.oneOrNone(tags_query, [req.body.username]);
        req.session.user = tags_info; // For discover.
        req.session.save()
        res.redirect("/discover"); // Successful login.
      }
    }
  } catch (error) {
    // Log the error
    console.log('error: ', error);
    // Internal server error, return an error response
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};
app.use(auth);


// About API
app.get("/about", (req, res) => {
  res.render("pages/about")
});

// Helper route (Discover)
app.get('/api/getUserData', async (req, res) => {
  try {
    // Fetch all user data from the database
    const userData = await db.many('SELECT * FROM tags');

    // Respond with the user data
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error.message || error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Discover API
app.get("/discover", (req, res) => {
  const loggedInUser = req.session.user;
  res.render("pages/discover", { loggedInUser });
});

// Discover API
app.get("/api/discover/matches", async (req, res) => {
  try {
    // Check if the session contains user information
    const loggedInUser = req.session.user;

    if (!loggedInUser) {
      console.error('No logged-in user in the session.');
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const loggedInUsername = loggedInUser.username;

    // Log the loggedInUsername to check if it's correct
    console.log('Logged-in username:', loggedInUsername);

    // Fetch the user's attributes from the database
    const userFromDB = await db.oneOrNone('SELECT * FROM tags WHERE username = $1', [loggedInUsername]);

    // Log the userFromDB to check if it's found
    console.log('User from database:', userFromDB);

    if (!userFromDB) {
      console.error('Logged-in user not found in the database.');
      res.status(404).json({ status: 'error', message: 'Logged-in user not found' });
      return;
    }

  } catch (error) {
    console.error('Error getting matching counts:', error.message || error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.get("/profile", (req, res) => {
  const loggedInUser = req.session.user;
  res.render("pages/profile", {
    username: loggedInUser.username,
    name: loggedInUser.name,
    mountain: loggedInUser.mtn_name,
    skill_level: loggedInUser.skill_level,
    ski_or_board: loggedInUser.ski_or_board,
    });
  });

// Logout API
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.render("pages/login", {message: "Logged out Successfully"});
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');