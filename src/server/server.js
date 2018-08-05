const express = require('express')
const MongoClient = require('mongodb').MongoClient
const passport = require('passport')
const session = require('express-session')
const connectMongo = require('connectMongo')
const compression = require('compression')
const serveStatic = require('express-static-gzip')
const helmet = require('helmet')
const favicon = require('serve-favicon')
const logger = require('morgan')
const dotenv = require('dotenv')

const renderPage = require('./renderPage')
const configurePassport = require('./passport')
const api = require('./routes/api')
const auth = require('./routes/auth')
const fetchBoardData = require('./fetchBoardData')

// Load environment variables from .env file
dotenv.config();

const app = express();

const MongoStore = connectMongo(session);

MongoClient.connect(process.env.MONGODB_URL).then(client => {
  const db = client.db(process.env.MONGODB_NAME);

  configurePassport(db);

  app.use(helmet());
  app.use(logger("tiny"));
  app.use(compression());
  app.use(favicon("dist/public/favicons/favicon.ico"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // aggressive cache static assets (1 year)
  // app.use("/static", express.static("dist/public", { maxAge: "1y" }));
  app.use(
    "/static",
    serveStatic("dist/public", { enableBrotli: true, maxAge: "1y" })
  );

  // Persist session in mongoDB
  app.use(
    session({
      store: new MongoStore({ db }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/auth", auth);
  app.use("/api", api(db));
  app.use(fetchBoardData(db));
  app.get("*", renderPage);

  const port = process.env.PORT || "1337";
  /* eslint-disable no-console */
  app.listen(port, () => console.log(`Server listening on port ${port}`));
});
