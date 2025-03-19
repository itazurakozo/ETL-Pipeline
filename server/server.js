//------------------REQUIRES------------------//

// require in express
const express = require('express');
// declare app w/ express invocation
const app = express();


// listen-connect to server
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}...`)
});


//------------------ERROR HANDLERS------------------

//catch-all 
app.use((req, res) => {
  res.status(404).send('Route not found');
});

//global
app.use((err, req, res, next) => {
  const defaultErr = {
      log: 'Error caught in global handler',
      status: 500,
      message: {err: 'An error occurred'}
  }
  const errorObj = Object.assign({}, defaultErr, err);
  console.log(errorObj.log);
  return res.status(errorObj.status).json(errorObj.message);
})

module.exports = app;