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
    '/': '&#x2F;',
    '\n': '<br>'
};

// Regex containing the keys listed immediately above.
var htmlEscaper = /[&<>"'\/\n]/g;

// Escape a string for HTML interpolation.
var escapeHTML = function(string) {
    return ('' + string).replace(htmlEscaper, function(match) {
        return htmlEscapes[match];
    });
};


function make_cmd(src, dst, extra){
    var ext = []
    for(i in extra){
        ext = ext.concat("-"+i)
        ext = ext.concat(extra[i])
    }
    return ['SProtect', [src].concat(ext)]
}

function change_ext(filename){
    return filename.substr(0, filename.length-4) + '.svmp.exe'
}

function error_template(err, stdout, stderr){
    return '<html><head></head><body>'+
        '<h2>err:</h2><div class="err">'+escapeHTML(err)+'</div>'+
        '<h2>stdout:</h2><div class="stdout">'+escapeHTML(stdout)+'</div>'+
        '<h2>stderr:</h2><div class="stderr">'+escapeHTML(stderr)+'</div>'+
        '</body></html>'
}

function upload_file(req, res){
    if(req.method != 'POST'){
        res.writeHead(302, {'Location':redirect_url})
        res.end()
        return
    }
    var tmp_src_path, tmp_dst_path
    var _filename, _extra_args = {}

    var busboy = new Busboy({headers: req.headers})
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        _extra_args[fieldname] = +(val)
    });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        _filename = filename
        const ext = path.extname(filename)
        tmp_src_path = tmp.tmpNameSync({postfix:ext})
        tmp_dst_path = change_ext(tmp_src_path)
        const tmp_upload = fs.createWriteStream(tmp_src_path)
        file.pipe(tmp_upload)
    })
    busboy.on('finish', function(){
        const [cmd, args] = make_cmd(tmp_src_path, tmp_dst_path, _extra_args)
        console.log('sec,dst', cmd, args)

        var stdout_str = "",
            stderr_str = ""

        var proc = spawn(cmd, args)
        proc.stdout.on('data', function(chunk){
            stdout_str += chunk
        })
        proc.stderr.on('data', function(chunk){
            stderr_str += chunk
            console.log('[waring]:', chunk)
        })
        proc.on('close', function(code){
            fs.access(tmp_dst_path, fs.constants.R_OK, function(err){
                if(err){
                    res.end(error_template(err, stdout_str, stderr_str))
                }else{
                    res.setHeader('Content-disposition', 'attachment; filename=' + change_ext(_filename))
                    res.setHeader('Content-type', 'application/octet-stream')
                    fs.createReadStream(tmp_dst_path).pipe(res)
                }
            })
        })
        proc.on('error', function(err){
            res.end(error_template(err, stdout_str, stderr_str))
        })
    })
    req.pipe(busboy)
}

function tag(name, attribute, content){
    return `<${name} ${attribute} >${content}</${name}>`
}
function div(class_name, content, attribute=""){
    return tag('div', `class="${class_name}"`+attribute, content)
}

function style(style_obj){
    var ret = ""
    for(ek in style_obj){
        var elements = ""
        for(sk in style_obj[ek]){
            elements += `${sk}: ${style_obj[ek][sk]};\n`
        }
        ret += ek+"{\n"+elements+"}\n\n"
    }
    return ret
}

function html_base(styles, content, scripts){
    return [
        "<html><head>",
        "<style>", styles, "</style>",
        "</head>",
        "<body>",
        '<div class="content">', content, '</div>',
        scripts,
        "</body></html>"
    ].join("\n")
}

function index(){
    return html_base(
        style({
            'body': {
                'background-color': '#227',
            },
            '.content': {
                'max-width': '800px',
                'margin': '5rem auto',
                'padding': '2rem',
                'background-color': '#222',
                'color': 'lightcyan',
            },
            '.item-head': {
                'display': 'inline-block',
                'min-width': '10rem',
            }
        }),
        [
            '<form method="POST" enctype="multipart/form-data" action="/upload">',
            div('list-item', div('item-head', 'RI:') + '<input type="text" name="RI" value="256" />'),
            div('list-item', div('item-head', 'NE:') + '<input type="text" name="NE" value="0" />'),
            div('list-item', div('item-head', 'IE:') + '<input type="text" name="IE" value="1" />'),
            div('list-item', div('item-head', 'ID:') + '<input type="text" name="ID" value="-1" />'),
            div('list-item', div('item-head', 'GI:') + '<input type="text" name="GI" value="-1" />'),
            div('list-item', div('item-head', 'CD:') + '<input type="text" name="CD" value="-1" />'),
            div('list-item', div('item-head', 'BD:') + '<input type="text" name="BD" value="-1" />'),
            div('list-item', div('item-head', 'VT:') + '<input type="text" name="VT" value="0" />'),
            div('list-item', div('item-head', 'TC:') + '<input type="text" name="TC" value="45" />'),
            div('list-item', '<input type="file" name="filefield">'),
            div('list-item', '<input type="submit"></input>'),
            '</form>',
        ].join("\n"),
        ""
    )
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




