const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const LocalStrategy = require("passport-local").Strategy;
const Joi = require("joi");
const db = require("./src/services/db")
require("dotenv").config();

const app = express();

app.use(passport.initialize());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Incorrect username or password" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect username or password" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUserById(user.id)
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});


app.get('/userlist', verifyToken, async (req, res) => {
  try {
    const userslist = await db.getUserList(req.token.id);
    res.status(200).json({ users: userslist })
  } catch (error) {
    console.error('Error fetching user list', error);
      return res.status(500).json({errorMsg:'Error fetching user list.', error});
  }
});

app.get('/chatlist', verifyToken, async (req, res) => {
  try {
    const chatlist = await db.getChatList(req.token.id);
    res.status(200).json({ chats: chatlist })
  } catch (error) {
    console.error('Error fetching chat list', error);
      return res.status(500).json({errorMsg:'Error fetching chat list.', error});
  }
});

app.get('/chat/:chatId', verifyToken, async (req, res) => {
  const chatId = parseInt(req.params.chatId);
  if (isNaN(chatId)) {
    return res.status(400).json({ errorMsg: 'Invalid chat ID' });
  }
  try {
    const chat = await db.getChatById(chatId);
    if (!chat) {
      return res.status(400).json({ errorMsg: 'Invalid chat ID' });
    }
    if (!chat.participants.some(participant => participant.userId === req.token.id)) {
      return res.status(403).json({message:'Forbidden'});
    }
    return res.status(200).json({chat:chat});
  } catch (error) {
    console.error('Error fetching chat', error);
    return res.status(500).json({errorMsg:'Error fetching chat'});
  }
})

app.post('/new/chat/:user2', verifyToken, async (req, res) => {
  const user1Id = req.token.id;
  const user2Id = parseInt(req.params.user2);
  try {
    let directChat = await db.getDirectChat(user1Id, user2Id);
    if (!directChat) {
      directChat = await db.newDirectChat(user1Id,user2Id, req.body.message);
      return res.status(200).json({ newMessage: directChat.messages[0] });
    } else {
      const newMessage = await db.newMessage(directChat.id,user1Id,req.body.message);
      return res.status(200).json({ newMessage: newMessage });

    }
  } catch (error) {
    return res.status(500).json({errorMsg:'Error creating new chat.', error});
  }
})

app.post('/new/message/:chatid', verifyToken, async (req, res) => {
  const chatId = path.parseInt(req.params.chatid);
  const userId = req.token.id;
  try {
    const chat = await db.getChatById(chatId);
    if (chat.participants.some(part => part.userId === userId)) {
      const newMessage = await db.newMessage(chatId, userId, req.body.message);
      return res.status(200).json({ newMessage: newMessage });
    }
  } catch (error) {
    return res.status(500).json({errorMsg:'Error creating new message.', error});
  }
})



// Login and Register routes

app.post('/login', validateLogin, (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '30 days' }
      );
      console.log(user);
      return res.json({ token: token, profile: JSON.stringify(user) });
    })(req,res,next);
  });

app.post('/register', validateRegistration, async (req, res) => { 
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      await db.createUserWithProfile(req.body.username, hashedPassword, '', req.body.fullName, 'A short description about you.')
      return res.status(200).json({message:'Account created successfully'});
    } catch (error) {
      console.error('Error creating account', error);
      return res.status(500).json({errorMsg:'Error creating account.', error});
    }
  });


   // Validation middlewares
  
   function validateRegistration(req, res, next) {
    const { error } = registrationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
  
  function validateLogin(req, res, next) {
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };


  const registrationSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(1).max(34).required(),
    aboutMe: Joi.string().min(1).max(255)
  });
  
  const loginSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).required()
  });

  function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader === 'undefined') {
      return res.sendStatus(403);
    }
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
  
    jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        return res.status(403);
      }
  
    req.token = decodedToken;
    next();
  });
  }
  



app.listen(8000, () => console.log('Server listening on port 8000'));
