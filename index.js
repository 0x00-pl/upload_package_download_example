var http = require('http'),
    fs = require('fs'),
    tmp = require('tmp'),
    path = require('path'),
    spawn = require('child_process').spawn,
    Busboy = require('busboy')


const redirect_url = '/'

function make_cmd(src, dst, extra){
    return ['mv', [src, dst]]
}

function upload_file(req, res){
    if(req.method != 'POST'){
        res.writeHead(302, {'Location':redirect_url})
        res.end()
        return
    }
    const tmp_src_path = tmp.tmpNameSync()
    const tmp_dst_path = tmp.tmpNameSync()
    var busboy = new Busboy({headers: req.headers})
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        const tmp_upload = fs.createWriteStream(tmp_src_path)
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        file.pipe(tmp_upload)
    })
    busboy.on('finish', function(){
        const [cmd, args] = make_cmd(tmp_src_path, tmp_dst_path)
        console.log('sec,dst', cmd, args)
        var proc = spawn(cmd, args/*, {stdio: 'inherit'}*/)
        proc.on('close', function(code){
            console.log('code:', code)
            res.setHeader('Content-type', 'application/octet-stream')
            fs.createReadStream(tmp_dst_path).pipe(res)
        })
    })
    req.pipe(busboy)
}

function index(){
    return '<html><head></head><body>'+
        '<form method="POST" enctype="multipart/form-data" action="/upload">'+
        '<input type="text" name="textfield"><br />'+
        '<input type="file" name="filefield"><br />'+
        '<input type="submit">'+
        '</form>'+
        '</body></html>'
}


var server = http.createServer(function(req, res){
    console.log(req.url)
    if(req.url == '/upload'){
        return upload_file(req, res)
    }

    res.end(index())
})


server.listen(8888)




