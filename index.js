var express = require("express");
var app = express();
var redis = require('redis');


//TODO: create a redis client
const client = redis.createClient({
  host: '127.0.0.1',
  port: 6379,
  retry_strategy: function (options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      // End reconnecting on a specific error and flush all commands with a individual error
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      // End reconnecting after a specific timeout and flush all commands with a individual error
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      // End reconnecting with built in error
      return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
});

client.on('error', (err) => {
  console.error('Redis error: ', err);
});

// serve static files from public directory
app.use(express.static("public"));

// TODO: initialize values for: header, left, right, article and footer using the redis client
client.mset('header', 0, 'left', 0, 'article', 0, 'right', 0, 'footer', 0);
client.mget(['header', 'left', 'article', 'right', 'footer'], 
function(err,value){
  console.log(value);
});

// Get values for holy grail layout
function data() {
  // TODO: uses Promise to get the values for header, left, right, article and footer from Redis
  return new Promise((resolve, reject) => {
    client.mget(['header', 'left', 'article', 'right',' footer'],
    function(err,value){
      const data = {
        'header': Number(value[0]),
        'left': Number(value[1]),
        'article': Number(value[2]),
        'right': Number(value[3]),
        'footer': Number(value[4])
      };
      err ? reject(null) : resolve(data);
    });
  });
}

// plus
app.get("/update/:key/:value", function (req, res) {
  const key = req.params.key;
  let value = Number(req.params.value);

  //TODO: use the redis client to update the value associated with the given key
  client.get(key, function(err, reply) {
    value = Number(reply) +value
    client.set(key,value)

    data()
      .then(data => {
        console.log(data);
        res.send(data);
      });
  });
});

// get key data
app.get("/data", function (req, res) {
  data().then((data) => {
    console.log(data);
    res.send(data);
  });
});

app.listen(3000, () => {
  console.log("Running on 3000");
});

process.on("exit", function () {
  client.quit();
});
