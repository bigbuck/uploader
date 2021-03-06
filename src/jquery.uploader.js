/*! nice Uploader 0.1.0
 * (c) 2012-2013 Jony Zhang <zj86@live.cn>, MIT Licensed
 * http://niceue.com/uploader/
 */
/*jshint browser:true, strict:false*/
/*global ActiveXObject*/
;(function(window, $){
    var noop = $.noop,
        //默认配置
        defaults = {
            mode: 'html5',                    //上传模式
            action: "",                       //服务端处理脚本
            fieldName: 'file',                //POST字段名
            formData: null,                   //附加传送的表单数据
            multi: false,                     //是否多选文件
            auto: true,                       //是否自动上传（默认选择完文件后自动上传）
            showQueue: true,                  //是否显示队列（传递jQuery选择器自定义队列显示的元素，传递false关闭队列及进度条）
            showSpeed: '',                    //是否显示速度（传递jQuery选择器自定义速度显示的元素）
            fileSizeLimit: 0,                 //文件大小限制（'100kb' '5M' 等）
            fileTypeDesc: '',                 //可选择的文件的描述，用中竖线分组。此字符串出现在浏览文件对话框的文件类型下拉中
            fileTypeExts: '',                 //允许上传的文件类型类表，用逗号分隔多个扩展，用中竖线分组（eg: 'jpg,jpeg,png,gif'）
            //上传事件（如果有事件参数，则包含event.file）
            onInit: noop,                     //初始化完成 ()
            onClearQueue: noop,               //清空队列 ()
            
            onSelected: noop,                 //文件选择并确定后 (filelist)
            onCancel: noop,                   //当文件被移除队列 (file)
            
            onError: noop,                    //本次上传失败 (event)
            //以下4个事件支持标准的ProgressEvent（）
            onStart: noop,                    //开始上传 (event)
            onProgress: noop,                 //正在上传中，提供进度信息 (event)
            onSuccess: noop,                  //本次上传成功 (event) 服务器返回值event.data
            onComplete: noop,                 //本次上传完成,失败与成功都触发 (event)
            
            onAllComplete: noop,              //全部上传完成 ()
            //按钮事件
            onMouseOver: noop,                //鼠标移到按钮 (element)
            onMouseOut: noop,                 //鼠标移出按钮 (element)
            onMouseClick: noop,               //点击按钮 (element)
            //添加队列事件（可自定义队列）
            onAddQueue: function(file, err){
                var html = '<ul>'/
                    + '<li class="f-name">'+ getShortName(file.name, 32) +'</li>'/
                    + '<li class="f-size">'+ stringifySize(file.size) +'</li>'/
                    + '<li class="f-progress">'+ (err ? err.name : '') +'</li>'/
                    + '<li class="f-operate"><a href="#" class="upload-cancel">x</a></li>'/
                    + '</ul>'/
                    + '<div class="upload-progress"></div>';
                return html;
            }
        },
        //语言包
        lang = {
            600: 'Installation error',                  //初始化发生错误
            601: 'Please select "{1}" format file',     //文件类型错误
            602: 'The file size must be less than {1}'  //文件大小超出定义
        },
        //支持的mimeTypes，可以在外部继续添加
        mimes = {};
        
    (function (str) {
        var blocks = str.split(/,/), i, j, suffix;
        for (i = 0; i < blocks.length; i += 2) {
            suffix = blocks[i + 1].split(/ /);
            for (j = 0; j < suffix.length; j++) {
                mimes[suffix[j]] = blocks[i];
            }
        }
    })(
    "image/x-icon,ico,"+
    "image/bmp,bmp,"+
    "image/gif,gif,"+
    "image/jpeg,jpeg jpg jpe,"+
    "image/photoshop,psd,"+
    "image/png,png,"+
    "image/svg+xml,svg svgz,"+
    "image/tiff,tiff tif,"+
    "text/plain,asc txt text diff log,"+
    "text/html,htm html xhtml,"+
    "text/xml,xml,"+
    "text/css,css,"+
    "text/csv,csv,"+
    "text/rtf,rtf,"+
    "audio/mpeg,mpga mpega mp2 mp3,"+
    "audio/x-wav,wav,"+
    "audio/mp4,m4a,"+
    "audio/ogg,oga,"+
    "audio/webm,webma,"+
    "video/mpeg,mpeg mpg mpe,"+
    "video/quicktime,qt mov,"+
    "video/mp4,mp4,"+
    "video/x-m4v,m4v,"+
    "video/x-flv,flv,"+
    "video/x-ms-wmv,wmv,"+
    "video/avi,avi,"+
    "video/ogg,ogv,"+
    "video/webm,webmv,"+
    "video/vnd.rn-realvideo,rv,"+
    "application/msword,doc dot,"+
    "application/pdf,pdf,"+
    "application/pgp-signature,pgp,"+
    "application/postscript,ps ai eps,"+
    "application/rtf,rtf,"+
    "application/vnd.ms-excel,xls xlb,"+
    "application/vnd.ms-powerpoint,ppt pps pot,"+
    "application/zip,zip,"+
    "application/x-rar-compressed,rar,"+
    "application/x-shockwave-flash,swf swfl,"+
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document,docx,"+
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template,dotx,"+
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,xlsx,"+
    "application/vnd.openxmlformats-officedocument.presentationml.presentation,pptx,"+
    "application/vnd.openxmlformats-officedocument.presentationml.template,potx,"+
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow,ppsx,"+
    "application/x-javascript,js,"+
    "application/json,json,"+
    "application/java-archive,jar war ear,"+
    "application/vnd.oasis.opendocument.formula-template,otf,"+
    "application/octet-stream,exe"
    );

    //简单实现类继承
    var Class = function(){};
    Class.extend = function(obj) {
        var parent = this.prototype, Class, proto, init, key;
        if (typeof obj === 'function') obj = obj.call(parent);
        init = obj.__construct;
        delete obj.__construct;
        //继承父级prototype而不执行构造函数
        proto = new this('!-');
        //拷贝公共方法
        for (key in obj) proto[key] = obj[key];
        //代理的类
        Class = function() {
            if ( arguments[0]!=='!-' && init ) init.apply(this, arguments);
        };
        proto.constructor = Class;
        //子类调用父类方法的接口
        proto.__super = function(fnName, args){
            return fnName ? parent[fnName].apply(this, args) : parent;
        };

        Class.prototype = proto;
        Class.extend = arguments.callee;
        
        return Class;
    };
    
    /**
     * 基类
     *
     * @class Uploader
     */
    var Uploader = Class.extend(function(){
        var files = {}, markTime, markLoad;
        
        //进度事件
        function _ProgressEvent(e, type, file){
            var isProgress = type === 'progress';
            this.type = type;
            this.timeStamp = +new Date();
            this.loaded = isProgress ? e.loaded : 0;
            this.total = isProgress ? e.total : 0;
            this.lengthComputable = isProgress ? e.lengthComputable : false;
            this.file = file;
        }
        //文件接口
        function _File(id, f){
            this.id = id;
            this.name = f.name;
            this.size = f.size;
            this.type = !f.type ? mimes[ f.name.split('.').pop() ] :
                        f.type.length < 6 ? mimes[f.type] :
                        f.type; //文件后缀最长5字符
            this.lastModifiedDate = +f.lastModifiedDate;
            if (f.error) this.error = f.error;
        }
        //包装异常
        function _Error(e){
            var code = e.code || +e.message,
                obj = {
                    600: 'Installation Error',
                    601: 'Type Error',
                    602: 'Size Error'
                };
            if (code) {
                this.code = code;
                e.name = e.name || obj[code] || 'HTTP Error';
                e.message = e.message || code;
            }
            if (e.file) this.file = e.file;
            this.type = 'error';
            this.name = i18n(e.name || 'Error');
            this.message = e.params ? i18n.apply( null, [e.message].concat(e.params) ) : i18n(e.message);
        }
        
        //通过id从队列中取文件
        function _getFileById(id){
            var queue = this.queue, i=queue.length;
            while (i--) {
                if (queue[i].id === id) return queue[i];
            }
        }
        //验证是否接受某类型
        function _acceptType(name){
            var type = name.substr( name.lastIndexOf('.') + 1 );
            return this.acceptExts[type];
        }
        //计算上传速度
        function _getSpeed(loaded, time){
            return stringifySize( (loaded - markLoad) * 1000 / (time - markTime) ) + '/s';
        }
        //显示上传进度
        function _showProgress(percent){
            var $queue = $('#'+ this.id +'___'+ this.loadId),
                $el = $queue.find('.upload-progress');
            $el.animate({width: percent}, 200);
            $queue.find('.f-progress').text( percent );
            if (percent === '100%') {
                $el.delay(2000).fadeOut(800, function(){
                    $(this).parent().remove();
                });
            }
        }
        
        return {
            //初始化
            init: function(el, str){
                var self = this,
                    $el =$(el),
                    opt = self.opt,
                    width = $el.outerWidth(),
                    left = $el.css('left'),
                    top = $el.css('top'),
                    style = 'width:'+ width +'px;height:'+ $el.outerHeight() +'px;margin-left:-'+ width +'px;';

                if (left) style += 'left:'+left+';';
                if (top) style += 'top:'+top+';';
                if (opt.showSpeed) self.$speed = $(opt.showSpeed);
                if (opt.showQueue) {
                    if (typeof opt.showQueue === 'string') {
                        self.$queuePanel = $(opt.showQueue).addClass('upload-queue');
                    } else {
                        $el.after('<div class="upload-queue" id="'+ self.id +'_queue"></div>');
                        self.$queuePanel = $('#'+ self.id + "_queue");
                    }
                }
                self.$btnProxy = $('<span class="upload-el"><div class="upload-btn-wrap" style="'+ style +'">'+ str +'</div></span>');
                $el.after(self.$btnProxy);
                self.el = $('#'+self.id)[0];
                self.$btn = $el;
                self.speed = '';
                self.queue = [];
                self.acceptExts = (function(str){
                    if (str === '*') return str;
                    var obj = {};
                    $.each(str.split('|').join(',').split(','), function(i, n){
                        obj[n] = 1;
                    });
                    return obj;
                })(opt.fileTypeExts);
                
                opt.onInit.call(self);
            },

            setOption: function(name, value) {
                var opt = this.opt;
                if (typeof name === 'string') {
                    opt[name] = value;
                } else if(typeof name === 'object') {
                    $.extend(opt, name);
                }
            },
            
            /**
             * 开始上传
             *
             * @method start
             */
            start: function(next){
                var q = this.queue;
                if (q.length) {
                    if ( q[0].error ) {
                        q.shift();
                        this.start(true);
                    } else {
                        this.upload( q[0].id );
                    }
                } else {
                    if (next) this.onAllComplete.call(this);
                }
            },
            
            /**
             * 停止上传
             *
             * @method stop
             */
            stop: function(){
            
            },
            
            //移除队列的一项（DOM）
            remove: function(id){
                if (this.$queuePanel) $('#'+this.id + '___' + id).delay(1000).fadeOut(500).remove();
            },
            
            destroy: function(){
                this.$btn && this.$btn.removeAttr('data-uploader');
                this.$btnProxy && this.$btnProxy.remove();
                this.$queuePanel && this.$queuePanel.remove();
                delete window[this.id];
            },
            
            getFile: function(id){
                return this.validId(id) ? files[id] : null;
            },
            
            validId: function(id){
                var i = this.queue.length;
                while (i--) {
                    if (this.queue[i].id === id) return true;
                }
            },
            
            onSelected: function(fileList){
                var self = this,
                    opt = self.opt,
                    f,
                    acceptExts = opt.fileTypeExts.split('|').join(','),
                    sizeLimit = parseSize(opt.fileSizeLimit),
                    queueHTML = '',
                    len = fileList.length;
                self.queue = [];
                files = {};
                $.each(fileList, function(i, file){
                    var _err;
                    f = new _File(+i, file);
                    if (self.acceptExts !== '*' && !_acceptType.call(self, file.name)) { //排除不允许的文件类型
                        self.onError( {code: 601, params: [acceptExts]}, false );
                        return;
                    }
                    if ( sizeLimit > 0 && f.size > sizeLimit ) { //触发文件大小错误
                        f.error = 'Size Error';
                        _err = new _Error({code: 602, params: [opt.fileSizeLimit.toUpperCase()], file: f});
                        self.onError(_err, false);
                    }
                    files[i] = file;
                    self.queue[i] = f;
                    if (self.$queuePanel) {
                        queueHTML += '<div class="queue'+ (i+1===len ? ' last-queue' : '') + (_err ? ' upload-error' : '') +'" id="'+ self.id + '___' + i +'">';
                        queueHTML += opt.onAddQueue.call(self, file, _err) + '</div>';
                    }
                });
                if (self.$queuePanel) {
                    self.$queuePanel.html( queueHTML );
                }
                if ( opt.onSelected.call(this, self.queue) !== false && opt.auto ) self.start();
            },
            
            onStart: function(e){
                var file = this.queue[0];
                this.loadId = file.id;
                this.loadFile = file;
                e = new _ProgressEvent(e, 'loadstart', file);
                markTime = e.timeStamp-1;
                markLoad = 0;
                this.el.style.top = '1000px';
                Uploader.uploading = true;
                this.opt.onStart.call(this, e);
            },
            
            onProgress: function(e){
                e = new _ProgressEvent(e, 'progress', this.loadFile);
                if (e.lengthComputable) {
                    this.speed = _getSpeed(e.loaded, e.timeStamp);
                    if (this.$speed) this.$speed.text(this.speed);
                    if (this.$queuePanel) _showProgress.call(this,  ((e.loaded / e.total) * 100).toFixed(1) + '%' );
                    markTime = e.timeStamp;
                    markLoad = e.loaded;
                }
                this.opt.onProgress.call(this, e);
            },
            
            onCancel: function(id){
                var index;
                $.each(this.queue, function(i, file){
                    if (file.id === +id) {
                        index = i;
                        return false;
                    }
                });
                this.remove(id);
                this.opt.onCancel.call(this, this.queue.splice(index, 1));
            },
            
            onClearQueue: function(){
                this.queue = [];
                if (this.$queuePanel) this.$queuePanel[0].innerHTML = '';
                this.el.style.top = '';
                Uploader.uploading = false;
                this.opt.onClearQueue.call(this);
            },
            
            onError: function(e, isComplete){
                var opt = this.opt,
                    id = e.id || this.loadId || null,
                    f = id ? (e.file || _getFileById.call(this, id)) : null;
                e.file = f;
                e = new _Error(e);
                if (opt.language && e.code && opt.language[e.code]) {
                    e.message = opt.language[e.code];
                }
                if (id !== null) {
                    if (this.$queuePanel) $('#'+this.id + '___' + id).addClass('upload-error').find('.f-progress').text(e.name);
                    if (isComplete !== false) this.onComplete();
                }
                this.opt.onError.call(this, e);
            },
            
            onSuccess: function(data){
                var e = new _ProgressEvent(null, 'load', this.loadFile);
                e.data = data;
                _showProgress.call(this, '100%');
                this.opt.onSuccess.call(this, e);
                this.onComplete();
            },
            
            onComplete: function(){
                var e = new _ProgressEvent(null, 'loadend', this.queue.shift());
                this.opt.onComplete.call(this, e);
                this.start(true);
            },
            
            onAllComplete: function(){
                files = {};
                this.queue = [];
                this.loadId = 0;
                this.loadFile = null;
                this.el.style.top = '';
                Uploader.uploading = false;
                if (this.$speed) this.$speed.text('');
                this.opt.onAllComplete.call(this);
            },
                
            onMouseOver: function(){
                this.$btn.addClass('upload-btn-over');
                this.opt.onMouseOver.call(this, this.$btn);
            },
            onMouseOut: function(){
                this.$btn.removeClass('upload-btn-over');
                this.opt.onMouseOut.call(this, this.$btn);
            },
            onMouseClick: function(){
                this.$btn.trigger('click');
                this.opt.onMouseClick.call(this, this.$btn);
            }
        };
    });

    
    /**
     * html5上传支持
     *
     * @class Uploader.html5
     * @extend Uploader
     */
    if (!!(window.FormData && (new XMLHttpRequest()).upload)) {
        Uploader.html5 = Uploader.extend(function(){
            var map = {loadstart:'onStart', progress:'onProgress', error:'onError', load:'onSuccess', loadend:'onComplete'};

            function _getAccept(){
                var arr = [], exts = this.opt.fileTypeExts.split('|').join(',').split(','), i, len = exts.length, ext;
                if (len) {
                    for (i=0; i<len; i++) {
                        ext = exts[i];
                        if (mimes[ext]) arr.push(mimes[ext]);
                    }
                    return arr.join(',');
                }
            }
            function _getXHR(){
                this.xhr = this.xhr || new XMLHttpRequest();
                return this.xhr;
            }
            
            return {
                __construct: function(id, options){
                    self = this;
                    this.id = id;
                    this.opt = options;
                },

                create: function(el){
                    var str = '<input type="file" id="'+ this.id +'" class="uploader" accept="'+ _getAccept.call(this) +'"'+ (this.opt.multi ? ' multiple':'') +'>';
                    this.init(el, str);
                },
                
                upload: function(id){
                    var self = this,
                        opt = self.opt, xhr, data, file;

                    file = self.getFile(id);
                    if (!file) {return;}
                    data = new FormData();
                    data.append(opt.fieldName, file);
                    if (opt.formData) {
                        $.each(opt.formData, function(key, val){
                            data.append(key, val);
                        });
                    }

                    xhr = _getXHR.call(self);
                    xhr.open(opt.method || 'POST', opt.action, true);
                    xhr.onreadystatechange = function(){
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200) {
                                self.onSuccess(xhr.responseText);
                            } else {
                                self.onError({code: xhr.status});
                            }
                        }
                    };
                    //所有上传事件交给代理处理
                    xhr.upload.onloadstart =
                    xhr.upload.onprogress =
                    xhr.upload.onerror = function(e) {
                        self[map[e.type]](e);
                    };
                    
                    $.each({
                        'Cache-Control': 'no-cache',
                        'X-Requested-With': 'XMLHttpRequest'
                    }, function(key, val){
                        xhr.setRequestHeader(key, val);
                    });
                    xhr.withCredentials = true; //携带Cookie头
                    xhr.send(data);
                },
                
                /**
                 * 取消上传
                 *
                 * @method cancel
                 * @param {Number/String} id 文件id
                 *
                 */
                cancel: function(id){
                    var self = this,
                        queue = self.queue;

                    if (id === '*') {
                        if ( self.xhr && self.xhr.readyState > 0 ) self.xhr.abort();
                        /*for (var i=0, len = self.queue.length; i<len; i++) {
                            self.opt.onCancel.call(self, self.queue.splice(0, 1));
                        }*/
                        self.onClearQueue();
                    } else {
                        if (!queue.length) {return;}
                        if (!id) id = queue[0].id;
                        if ( self.xhr && self.xhr.readyState > 0 && id === self.loadId ) self.xhr.abort();
                        self.onCancel(id);
                    }
                },
                
                /**
                 * 销毁
                 *
                 * @method destroy
                 */
                destroy: function(){
                    if (this.el) this.el.parentNode.removeChild(this.el);
                    this.xhr = null;
                    this.__super('destroy');
                }
            };
        });
    }
    
    /**
     * flash上传支持
     *
     * @class Uploader.flash
     * @extend Uploader
     */
    defaults.swf = (function(){
        var src = $('script[src*="uploader."]').attr('src'),
            path;
        if (src === undefined) src = '';
        path = src.split('/').slice(0, -1).join('/');
        if (path) path += '/';
        return  path + 'uploader.swf';
    })();
    defaults.preventCache = true;
    Uploader.flash = Uploader.extend(function(){
        var isIE = !!window.ActiveXObject,
            swfVersion = (function(){
                var ver, SF = 'ShockwaveFlash', plug;
                if (isIE) {
                    try {
                        ver = new ActiveXObject(SF + '.' + SF).GetVariable('$version');
                        ver = ver.split(' ')[1].split(',')[0];
                    } catch(ex) {}
                } else {
                    plug = navigator.plugins['Shockwave Flash'];
                    if (typeof plug === 'object') ver = plug.description.split(' ')[2];
                }
                return parseInt(ver, 10);
            })();
        
        //生成Flash的HTML(只有src是必传的参数)
        function _embedSWF(opt){
            if (!opt.src) return;
            var url = opt.src + (opt.src.indexOf('?') !== -1 ? '&' : '?') + '__=' + (+new Date()),
                html = '',
                attr = {
                    type: 'application/x-shockwave-flash',
                    width: '100%',
                    height: '100%'
                },
                param = {
                    wmode: 'transparent',
                    allowScriptAccess: 'always'
                },
                obj2attr = function(obj){
                    var key, str = '';
                    for (key in obj ) {
                        str += ' ' + key + '="' + obj[key] + '"';
                    }
                    return str;
                };
            (function(arr){
                var i=arr.length, key, obj = {};
                while (i--) {
                    obj[ arr[i] ] = 1;
                }
                for (key in opt) {
                    if (obj[key]) {
                        attr[key] = opt[key];
                    } else {
                        param[key] = opt[key];
                    }
                }
            })('width height id class style'.split(' '));
            param.src = url;
            if (isIE) {
                //对于IE，加上codebase参数才可以在没有安装flash的情况下自动提示安装ActiveX控件
                attr.codebase = "http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,28,0";
                //IE6-8必须同时设置data属性和src参数(或者movie参数)
                attr.data = url;
                html += '<object' + obj2attr(attr) + '>';
                for (var key in param) {
                    html+='<param name="'+ key +'" value="'+ param[key] +'">';
                }
                html += '</object>';
                
            //现代浏览器用embed方式更好(Safari用object装载flash存在很多问题)
            } else {
                //Chrome自带flash10.0，Firefox、Opera、Safari会自动提示用户安装，所以对于现代浏览器pluginpage参数不用设置
                html += '<embed' + obj2attr(param) + obj2attr(attr) + '>';
            }
            return html;
        }
        
        //移除flash
        function _removeSWF(obj){
            if (isIE) {
                obj.style.display = "none";
                (function(){
                    if (obj.readyState === 4) {
                        //移除相关引用，防止内存泄露
                        for (var i in obj) {
                            if (typeof obj[i] === "function") obj[i] = null;
                        }
                        obj.parentNode.removeChild(obj);
                    } else {
                        //正在加载中的flash不能直接移除，延时下重新执行
                        setTimeout(arguments.callee, 15);
                    }
                })();
            } else {
                obj.parentNode.removeChild(obj);
            }
        }
        
        return {
            __construct: function(id, options){
                this.id = id;
                this.opt = options;
            },
            
            swfVersion: swfVersion,
            
            create: function(el){
                var opt = this.opt,
                    params = {
                        id: this.id,
                        path: (function(){
                            var arr = location.pathname.split('/');
                            arr.pop();
                            return arr.join('/') + '/';
                        })(),
                        action: opt.action,
                        field: opt.fieldName,
                        desc: opt.fileTypeDesc,
                        ext: opt.fileTypeExts
                    };
                if (opt.multi) params.multi = 1;
                if (opt.debug) params.debug = 1;
                if (opt.method) params.method = opt.method;
                if (opt.formData) params.formData = $.param(opt.formData);
                if (!swfVersion || swfVersion < 9) {
                    //this.onError({code: 600});
                    $(el).addClass('uploader-init-error');
                }
                this.init( el, _embedSWF({src:opt.swf, 'id':this.id, 'class':'uploader', flashvars:$.param(params)}) );
                
            },
            
            upload: function(id){
                this.validId(id) && this.el.startUpload(''+id);
            },
            
            /**
             * 取消上传
             *
             * @method cancel
             * @param {Number/String} id 文件id
             *
             */
            cancel: function(id){
                var queue = this.queue;
                if (queue.length) {
                    if (!id) id = queue[0].id;
                }
                this.el.cancelUpload(id);
            },
            
            /**
             * 销毁
             *
             * @method destroy
             */
            destroy: function(){
                _removeSWF(this.el);
                this.__super('destroy');
            }
        };
    });
    
    
    //集中处理事件
    $(function(){
        var $body = $('body'), NS = '.uploader';
        
        $body.on('change' + NS, ':file.uploader', function(){
            window[this.id].onSelected(this.files);
        }).on('click' + NS, ':file.uploader', function(e){
            window[this.id].onMouseClick();
        });
        //注册鼠标移入和移出事件
        $body.on('mouseenter' + NS, 'div.upload-btn-wrap', function(e){
            window[this.firstChild.id].onMouseOver();
        }).on('mouseleave' + NS, 'div.upload-btn-wrap', function(e){
            window[this.firstChild.id].onMouseOut();
        });
        //删除队列中的文件
        $body.on('click' + NS, 'a.upload-cancel', function(e){
            var $queue = $(this).closest('.queue'),
                arr = $queue.attr('id').split('___');
            if ($queue.hasClass('upload-error')) {
                $queue.remove();
            } else {
                window[arr[0]].cancel( arr[1] );
            }
            e.preventDefault();
        });
    });

    
    /**
     * 解析为带单位的字符串表示
     *
     * @param {Number/String} bytes 文件尺寸，如102400
     * @return {String} 文件尺寸，如"100kb"
     */
    function stringifySize(bytes){
        var i = -1;
        while (bytes > 1000) {
            bytes = bytes / 1024;
            i++;
        }
        return Math.max(bytes, 0.1).toFixed(1) + ['KB', 'M', 'G', 'T'][i];
    }
    
    /**
     * 解析为字节的数字
     *
     * @param {String/Number} size 文件尺寸，如"5M"、"100kb"
     * @return {Number} 字节数，如102400
     */
    function parseSize(size) {
        var unit = {k:1024, m:1048576, g:1073741824}, arr;
        if (typeof size === 'string') {
            arr = /^([0-9]+)([mgk]+)$/.exec(size.toLowerCase().replace(/[^0-9mkg]/g, ''));
            size = +arr[1];
            size *= unit[arr[2]];
        }
        return size;
    }
    
    /**
     * 短文件名
     *
     * @param {String} fileName 文件名
     * @param {Number} totle 最终长度
     * @return {String} 新的文件名
     */
    function getShortName(fileName, totle){
        var len = fileName.length,
            start,
            end;
        if (len > totle) {
            end = 4 + 1 + (len - fileName.lastIndexOf('.') - 1);
            start = totle - end - 3;
            if (start%2) start-=1;
            fileName = fileName.substr(0, start) + '...' + fileName.substr(-end);
        }
        return fileName;
    }
    
    /**
     * 国际化支持
     *
     * @param {Object/String} obj 设置语言/ 获取语言
     * @return {Object/String} 语言包/ 翻译后的字符串
     */
    function i18n(obj){
        if (!obj) return '';
        //设置语言
        if (typeof obj === 'object') {
            return $.extend(lang, obj);
        }
        //获取语言
        var str = lang[obj] || obj, args = arguments;
        if (args.length > 1) {
            for (var i=1,len=args.length; i<len; i++) {
                str = str.replace('{' + i + '}', args[i]);
            }
        }
        return str;
    }
    
    //挂载
    Uploader.guid = 0;
    Uploader.uploading = false; //是否正在上传中（用于离开页面时正在上传的情况）
    Uploader.defaults = defaults;
    Uploader.mimes = mimes;
    Uploader.lang = lang;
    Uploader.i18n = i18n;
    Uploader.stringifySize = stringifySize;
    Uploader.parseSize = parseSize;
    Uploader.getShortName = getShortName;
    //暴露
    $.uploader = Uploader;
    
    
    /**
     * 外部插件方式调用
     * @example
     *   $('#file').uploader({
            action: 'upload.php',
            fieldName: 'img',
            fileTypeDesc: '图片文件',
            fileTypeExts: 'jpg,gif,png',
            fileSizeLimit: '200kb',
            onSuccess: function(e, file, data){
                do something...
            },
            onError: function(e, file){
                do something...
            }
         });
     */
    $.fn.uploader = function(){
        var args = arguments,
            attrId = $(this).attr('data-uploader');
        
        //不传参数，直接返回对应的对象或者找不到的话返回null
        if (!args.length) {
            return attrId ? window[attrId] : null;
        }
        
        //传方法名，可调用Public方法
        if (typeof args[0] === 'string' && args[0].substr(0,2) !== 'on') {
            if (attrId) {
                window[attrId][args[0]].apply(window[attrId], Array.prototype.slice.call(args, 1));
            }
            return this;
        }
        this.on('remove', function(){
            window[ $(this).attr('data-uploader') ].destroy();
        });
        //传对象，初始化调用
        var opt = $.extend({}, defaults, args[0]);
        opt.fileTypeExts = opt.fileTypeExts.replace(/ /g, '');
        //即使配置了高级模式，不支持的话也要降级
        if (!Uploader[opt.mode]) opt.mode = 'flash';
        return this.each(function(){
            var id = 'uploader_'+ (opt.id || Uploader.guid++);
            $(this).attr('data-uploader', id);
            window[id] = new Uploader[opt.mode](id, opt);
            window[id].create(this);
        });
    };
    
    
    //导入中文语言包
    i18n({
        400: '(400)请求无效',
        404: '(404)请求的资源不存在',
        500: '(500)内部服务器错误',
        501: '(501)未执行',
        502: '(502)连接超时',
        //上面为HTTP级别，下面为插件级别
        600: '初始化上传发生错误',
        601: '请选择“{1}”格式的文件',
        602: '文件尺寸不能大于{1}'
    });
    
})(window, jQuery);