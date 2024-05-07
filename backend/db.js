const mongoose = require('mongoose');
require('dotenv').config();

const dbURI = process.env.DBURI;

const options = {
  autoIndex: false,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

mongoose.connect(dbURI, options).then(
  () => { console.log('Database connection established!'); },
  (err) => { console.log('Error connecting Database instance due to: ', err); },
);

mongoose.connection.on('error', (err) => {
  console.log(`Mongoose default connection has occurred \n${err}`);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection is disconnected');
});

process.on('SIGINT', () => {
  mongoose.connection.close().then(() => {
    console.log('Mongoose default connection is disconnected due to application termination');
    process.exit(0);
  }).catch((err) => {
    console.error('Failed to close mongoose connection', err);
    process.exit(1);
  });
});

