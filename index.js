var http = require('http'),
    fs = require('fs'),
    tmp = require('tmp'),
    path = require('path'),
    spawn = require('child_process').spawn,
    Busboy = require('busboy'),
    inspect = require('util').inspect


const redirect_url = '/'


// List of HTML entities for escaping.
var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
};

// Regex containing the keys listed immediately above.
var htmlEscaper = /[&<>"'\/]/g;

// Escape a string for HTML interpolation.
var escapeHTML = function(string) {
    return ('' + string).replace(htmlEscaper, function(match) {
        return htmlEscapes[match];
    });
};


function make_cmd(src, dst, extra){
    var ext = []
    for(i in extra){
        ext.append("-"+i)
        ext.append(extra[i])
    }
    return ['SProtect', [src].concat(ext)]
}

function change_ext(filename){
    return filename.substr(0, filename.length-4) + '.svmp.exe'
}

function error_template(err, stdout, stderr){
    return '<html><head></head><body>'+
        '<div class="err">'+escapeHTML(err)+'</div>'+
        '<div class="stdout">'+escapeHTML(stdout)+'</div>'+
        '<div class="stderr">'+escapeHTML(stderr)+'</div>'+
        '</body></html>'
}

function upload_file(req, res){
    if(req.method != 'POST'){
        res.writeHead(302, {'Location':redirect_url})
        res.end()
        return
    }
    const tmp_src_path = tmp.tmpNameSync({postfix:'.exe'})
    const tmp_dst_path = change_ext(tmp_src_path)   // tmp.tmpNameSync()
    var _filename
    var _extra_args = {}
    var busboy = new Busboy({headers: req.headers})
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        _extra_args[fieldname] = int(inspect(val))
    });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        _filename = filename
        const tmp_upload = fs.createWriteStream(tmp_src_path)
        console.log('[debug] File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        file.pipe(tmp_upload)
    })
    busboy.on('finish', function(){
        const [cmd, args] = make_cmd(tmp_src_path, tmp_dst_path, _extra_args)
        console.log('sec,dst', cmd, args)
        var proc = spawn(cmd, args, {stdio: 'inherit'})
        proc.on('close', function(code){
            fs.access(tmp_dst_path, fs.constants.R_OK, function(err){
                if(err){
                    res.end(error_template(err, "", ""))
                }else{
                    res.setHeader('Content-disposition', 'attachment; filename=' + change_ext(_filename))
                    res.setHeader('Content-type', 'application/octet-stream')
                    fs.createReadStream(tmp_dst_path).pipe(res)
                }
            })
        })
        proc.on('error', function(err){
            res.end(error_template(err, "", ""))
        })
    })
    req.pipe(busboy)
}

function index(){
    return '<html><head></head><body>'+
        '<form method="POST" enctype="multipart/form-data" action="/upload">'+
        '<input type="text" name="RI" value="256" /><br />'+
        '<input type="text" name="NE" value="0" /><br />'+
        '<input type="text" name="IE" value="1" /><br />'+
        '<input type="text" name="ID" value="-1" /><br />'+
        '<input type="text" name="GI" value="-1" /><br />'+
        '<input type="text" name="CD" value="-1" /><br />'+
        '<input type="text" name="BD" value="-1" /><br />'+
        '<input type="text" name="VT" value="0" /><br />'+
        '<input type="text" name="TC" value="45" /><br />'+
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
console.log("server listen on 8888")




