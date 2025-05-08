const winston = require('winston');
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');;

dotenv.config();

require('dotenv').config();

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for form data
// app.use(bodyParser.urlencoded({ extended: true })); // for form data
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

app.use((req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url}`);
  next();
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ message: 'Internal Server Error' });

});

const otpRoutes = require('./routes/otpAuth');
app.use('/api/auth', otpRoutes);

const uri = process.env.MONGO_URI || "mongodb+srv://vipinsingh632:ZMBRK3OLgSaaNgin@auth.h7vvjm4.mongodb.net/auth";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))

  .catch(err => console.error(err));
  app.get('/', (req, res) => {
    console.log("GET / called");
    res.json({ message: "API is running" }); // ← make sure this is a JSON response
  });
app.use('/api/auth', require('./routes/auth'));
app.use('/uploads', express.static('uploads'));


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));