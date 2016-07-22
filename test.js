const http = require('http');

const server = http.createServer((req, res) => {
    console.log("r")
    req.pipe(process.stdout)
    res.end("hello");
});
server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
console.log("server listen 1")
server.listen(8888, function(){
    console.log("server listen 2")
})
