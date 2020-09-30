const path = require('path');
const fs = require('fs');
const { check } = require('express-validator/check');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const morgan = require('morgan');
const authController = require('./controllers/auth');

const passport = require('passport');

const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://ritikgupta:ZU5DvtmxnizGbPsu@cluster0-mzunh.mongodb.net/chocodivine?retryWrites=true&w=majority`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, file.filename + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.isAdminAuthenticated = req.session.isAdmin;
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(passport.initialize());
app.use(passport.session());

app.get('/success', (req, res) => res.send(userProfile));
app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const GOOGLE_CLIENT_ID = '834372223643-ndcs8qon3tsqds4dg8jc3a41iinv0dig.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'oGOvNx3vs8HkjR0wWATi52mc';
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  // [
  //   check('email')
  //     .isEmail()
  //     .withMessage('Please enter a valid email.')
  //     .custom((value, { req }) => {
  //       return User.findOne({ email: value }).then(userDoc => {
  //         if (userDoc) {
  //           return Promise.reject(
  //             'E-Mail exists already, please pick a different one.'
  //           );
  //         }
  //       });
  //     })
  //     .normalizeEmail()
  //   body(
  //     'password',
  //     'Please enter a password with only numbers and text and at least 5 characters.'
  //   )
  //     .isLength({ min: 5 })
  //     .trim(),
  //   body('confirmPassword')
  //     .trim()
  //     .custom((value, { req }) => {
  //       if (value !== req.body.password) {
  //         throw new Error('Passwords have to match!');
  //       }
  //       return true;
  //     })
  // ],
  authController.postSignup
);


app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn,
    isAdminAuthenticated: req.session.isAdmin
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(8000);
  })
  .catch(err => {
    console.log(err);
  });
