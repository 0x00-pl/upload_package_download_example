const http = require('http')
const Writable = require('stream').Writable

var debug_writer = function(prefix){
    return new Writable({
        write(chunk, encoding, callback){
            console.log(prefix, chunk)
            callback()
        }
    })
}


var server = http.createServer((req, res) => {
    console.log(req.url, Object.keys(req))
    req.pipe(debug_writer('[d1]'))
    req.on('end', ()=>
           res.end("<form method='POST'>"+
                   "<input id='i' name='n'></input>"+
                   "<input type='submit'></input>"+
                   "</form>"))
});
server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
console.log("server listen 1")
server.listen(8888, function(){
    console.log("server listen 2")
})
