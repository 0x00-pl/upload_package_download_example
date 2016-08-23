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

function reset_style(){
    return {
        'border': 'none',
        'background-image': 'none',
        'background-color': 'transparent',
        '-webkit-box-shadow': 'none',
        '-moz-box-shadow': 'none',
        'box-shadow': 'none',
    }
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
        "<html lang=en><head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
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
            '.list-item': {
                'line-height': '2rem',
            },
            '.item-head': {
                'display': 'inline-block',
                'width': '30%',
                'padding': '0 0.5rem',
                'text-align': 'right',
                'box-sizing': 'border-box',
            },
            '.list-item > input[type=text]': Object.assign(reset_style(), {
                'width': '70%',
                'padding': '0 0.5rem',
                'transition': 'all 0.25s linear',
                'border-bottom': '2px solid gray',
                'color': 'lightcyan',
            }),
            '.list-item > input[type=text]:focus': {
                'border-bottom': '2px solid orange',
            },
        }),
        [
            '<form method="POST" enctype="multipart/form-data" action="/upload">',
            div('list-item', div('item-head', '垃圾指令充填密度:') + '<input type="text" name="RI" value="256" />',
                'title="[最小数值设置为21, 最高为99999, 数值越小充填量越大(程序运行效率受影响)].\n指令: -RandmoInstruct RI 300"'),
            div('list-item', div('item-head', 'NOR指令膨胀:') + '<input type="text" name="NE" value="0" />',
                'title="[底层逻辑运算指令膨胀度, 最小数值为0, 最高为10(程序运行效率受影响较大),].\n指令: -NorExpand NE 10"'),
            div('list-item', div('item-head', '立即数加密:') + '<input type="text" name="IE" value="1" />',
                'title="[关闭设置为1 开启设置1-10, 凡是遇见第2操作数为立即数时, 将加密该立即数, 随后生成解密算法插入到VM字节码中(程序运行效率受影响)].\n指令: -ImmEncrypt IE 1"'),
            div('list-item', div('item-head', '源码级指令变形:') + '<input type="text" name="ID" value="-1" />',
                'title="[最小数值位置为0, 最高为10(程序运行效率奇慢无比)].\n指令: -InstructDeformation ID 10"'),
            div('list-item', div('item-head', '源码级垃圾指令生成密度:') + '<input type="text" name="GI" value="-1" />',
                'title="[最小数值位置为0, 最高为10(程序运行效率受影响)].\n指令: -GarbageInstruct GI 10"'),
            div('list-item', div('item-head', '源码级代码乱序密度:') + '<input type="text" name="CD" value="-1" />',
                'title="[最小数值位置为0, 最高为10(程序运行效率受影响)].\n指令: -CodeDisorder CD 10"'),
            div('list-item', div('item-head', 'VM指令字节码乱序:') + '<input type="text" name="BD" value="-1" />',
                'title="[0不启用, 1启用. 将生成的字节码打乱存放顺序.]\n指令: -ByteCodeDisorder BD 1"'),
            div('list-item', div('item-head', '虚拟机选择:') + '<input type="text" name="VT" value="0" />',
                'title="[0普通虚拟机(运行效率最快), 1CALL式虚拟机(慢), 2乱序虚拟机(很慢)].\n指令: -VMacType VT 0"'),
            div('list-item', div('item-head', 'VM指令级临时寄存器轮转:') + '<input type="text" name="TC" value="45" />',
                'title="[数值范围为0-100, 包括0跟100, 设置0不开启此项, 1-100为VM指令的百分比度,比如设置60就表示有百分之60的VM指令,每一条会额外生成一组临时寄存器轮转代码, 临时寄存器也会随机选择需要轮转的个数(百分比太高会严重影响代码效率)].\n指令: -TmpRegChange TC 0"'),
            div('list-item', div('item-head', '寄存器轮转:') + '<input type="text" name="RC" value="45" />',
                'title="[数值范围为0-100, 包括0跟100, 设置0不开启此项, 1-100为指令的百分比度,比如设置60就表示有百分之60的指令,每一条会额外生成一组寄存器轮转代码,寄存器也会随机选择需要轮转的个数(百分比太高会影响代码效率)].\n指令: -RegChange RC 0"'),
            div('list-item', div('item-head', 'file') + '<input type="file" name="filefield">'),
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




