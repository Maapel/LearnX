
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors())

app.set('port', (process.env.PORT || 8081));

app.get('/api', (req, res) => {
      res.send('Hello from our server!')
})

app.listen(app.get('port'), function() {
  console.log('Express app vercel-express-react-demo is running on port', app.get('port'));
});

module.exports = app	