import bodyParser from 'body-parser'
import compression from 'compression' // compresses requests
import mongo from 'connect-mongo'
import express from 'express'
import session from 'express-session'
import mongoose from 'mongoose'
import logger from 'morgan'
import path from 'path'

import apiRouter from './controllers/api'
import { isProduction, MONGODB_URI, SESSION_SECRET } from './util/secrets'

const MongoStore = mongo(session)

// Create Express server
const app = express()

// Connect to MongoDB
const mongoUrl = MONGODB_URI

mongoose.connect(mongoUrl, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
	keepAlive: true,
	connectTimeoutMS: 30000,
	useUnifiedTopology: true
}).then(
	() => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
	}
).catch(err => {
    console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
    // process.exit();
});

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
	resave: true,
	saveUninitialized: true,
	secret: SESSION_SECRET,
	store: new MongoStore({
		url: mongoUrl,
		autoReconnect: true
	})
}))
app.use(logger(isProduction ? 'tiny' : 'dev'))

app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

app.use("/api", apiRouter);

export default app;
