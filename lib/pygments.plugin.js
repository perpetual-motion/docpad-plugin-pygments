
// stuff for extending the BasePlugin class
var __hasProp = {}.hasOwnProperty,
    __extends = function (child, parent) {
        for (var key in parent) {
            if (__hasProp.call(parent, key)) child[key] = parent[key];
        }
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
    };


function IsNullOrEmpty(str) {
    return str === null || str === "" || str == undefined;
};

function IsNullOrUndefined(str) {
    return str === null || str == undefined;
};

    
module.exports = function (BasePlugin) {
    var PygmentsPlugin, balUtil, highlightElement, jsdom, pygmentizeSource,htmlencoding;
 
    balUtil = require('bal-util');
    jsdom = require('jsdom');
    htmlencoding = require('jsdom/lib/jsdom/browser/htmlencoding.js');
    var http = require('http');
    
    pygmentizeSource = function (source, language, next, attempt) {
        var querystring = require("querystring");
        
        var text = '';
        language = IsNullOrEmpty( language ) ? "text" : language;
        console.log("Pygmentizing :"+language);
        var req = http.request({ host: "pygments.appspot.com", port: 80, path: '', method: 'POST' }, function(response) {
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                text += chunk;
            });
    
            response.on('end', function() {
                result = text; 
               
                if (result === '' && attempt < 3) {
                    return pygmentizeSource(source, language, next, attempt + 1);
                }
                
                if (result === '' && attempt == 3) {
                    throw new Error("Unable to pygmentize");
                }
                
                return next(null,  result);
            });
        });
        
        req.write(querystring.stringify({lang:language, code:source}));
        req.end(); 
        
        return this;
        
    };
    highlightElement = function (window, element, next) {
        var bottomNode, language, matches, source, topNode, _ref, _ref1;
        topNode = element;
        bottomNode = element;
        source = false;
        language = false;
        bottomNode = element;
        while (bottomNode.childNodes.length && ((_ref = String(bottomNode.childNodes[0].tagName).toLowerCase()) === 'pre' || _ref === 'code')) {
            bottomNode = bottomNode.childNodes[0];
        }
        topNode = element;
        while ((_ref1 = topNode.parentNode.tagName.toLowerCase()) === 'pre' || _ref1 === 'code') {
            topNode = topNode.parentNode;
        }
        if (/highlighted/.test(topNode.className)) {
            next();
            return this;
        }
        
        source = htmlencoding.HTMLDecode( balUtil.removeIndentation(bottomNode.innerHTML));
        language = String(bottomNode.getAttribute('lang') || topNode.getAttribute('lang')).replace(/^\s+|\s+$/g, '');
        if (!language) {
            if (bottomNode.className.indexOf('no-highlight') !== -1) {
                language = false;
            } else {
                matches = bottomNode.className.match(/lang(?:uage)?-(\w+)/);
                if (matches && matches.length === 2) {
                    language = matches[1];
                } else {
                    if (topNode.className.indexOf('no-highlight') !== -1) {
                        language = false;
                    } else {
                        matches = topNode.className.match(/lang(?:uage)?-(\w+)/);
                        if (matches && matches.length === 2) {
                            language = matches[1];
                        }
                    }
                }
            }
        }
        pygmentizeSource(source, language, function (err, result) {
            var resultElInner, resultElWrapper;
            if (err) {
                return next(err);
            }
            
            if (result) {
                resultElWrapper = window.document.createElement('div');
                resultElWrapper.innerHTML = result;
                resultElInner = resultElWrapper.childNodes[0];
                resultElInner.className += ' highlighted codehilite';
                topNode.parentNode.replaceChild(resultElInner, topNode);
            }
            return next();
        });
        return this;
    };
    return PygmentsPlugin = (function (_super) {

        __extends(PygmentsPlugin, _super);

        function PygmentsPlugin() {
            return PygmentsPlugin.__super__.constructor.apply(this, arguments);
        }

        PygmentsPlugin.prototype.name = 'pygments';

        PygmentsPlugin.prototype.renderDocument = function (opts, next) {
            var extension, file;
            extension = opts.extension, file = opts.file;
            if (file.type === 'document' && extension === 'html') {
                return jsdom.env({
                    html: "<html><body>" + opts.content + "</body></html>",
                    features: {
                        QuerySelector: true
                    },
                    done: function (err, window) {
                        var element, elements, key, tasks, value, _i, _len;
                        if (err) {
                            return next(err);
                        }
                        elements = window.document.querySelectorAll('code pre, pre code, .highlight');
                        if (elements.length === 0) {
                            return next();
                        }
                        tasks = new balUtil.Group(function (err) {
                            if (err) {
                                return next(err);
                            }
                            
                            opts.content = window.document.body.innerHTML;
                            return next();
                        });
                        tasks.total = elements.length;
                        for (key = _i = 0, _len = elements.length; _i < _len; key = ++_i) {
                            value = elements[key];
                            element = elements.item(key);
                            debugger;
                            highlightElement(window, element, tasks.completer());
                        }
                        return true;
                    }
                });
            } else {
                return next();
            }
        };

        return PygmentsPlugin;

    })(BasePlugin);
};
