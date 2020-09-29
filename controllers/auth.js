const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email: '',
      password: ''
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
const email = userProfile.emails[0].value;
console.log(email)
  // const email = req.body.email;
  // const password = req.body.password;

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(422).render('auth/login', {
  //     path: '/login',
  //     pageTitle: 'Login',
  //     errorMessage: errors.array()[0].msg,
  //     oldInput: {
  //       email: email,
  //       password: password
  //     },
  //     validationErrors: errors.array()
  //   });
  // }

  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password.',
          oldInput: {
            email: email,
            password: password
          },
          validationErrors: []
        });
      }
      // bcrypt
      //   .compare(password, user.password)
      //   .then(doMatch => {
      //     if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            if(email === 'ritik@ritik.com') req.session.isAdmin = true;
            req.session.save(err => {
              res.redirect('/');
            });
      //    }
          res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
              email: email,
              password: password
            },
            validationErrors: []
          });
        })
        .catch(err => {
          res.redirect('/login');
        });
    // })
    // .catch(err => {
    //   const error = new Error(err);
    //   error.httpStatusCode = 500;
    //   return next(error);
    // });
};

exports.postSignup = (req, res, next) => {
  const email = userProfile.emails[0].value;

  const user = new User({
        email: email,
        cart: { items: [] }
      });
  user
  .save()
  .then(result => {
    res.redirect('/login');
  })

  // const email = req.body.email;
  // const password = req.body.password;

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(422).render('auth/signup', {
  //     path: '/signup',
  //     pageTitle: 'Signup',
  //     errorMessage: errors.array()[0].msg,
  //     oldInput: {
  //       email: email,
  //       password: password,
  //       confirmPassword: req.body.confirmPassword
  //     },
  //     validationErrors: errors.array()
  //   });
  // }

  // bcrypt
  //   .hash(password, 12)
  //   .then(hashedPassword => {
  //     const user = new User({
  //       email: email,
  //       password: hashedPassword,
  //       cart: { items: [] }
  //     });
  //     return user.save();
  //   })
  //   .then(result => {
  //     res.redirect('/login');
  //   })
  //   .catch(err => {
  //     const error = new Error(err);
  //     error.httpStatusCode = 500;
  //     return next(error);
  //   });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
};