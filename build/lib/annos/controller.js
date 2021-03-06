"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = require("path");
const jbean_1 = require("jbean");
const application_1 = require("../application");
const base_1 = require("../base");
function Controller(component, path) {
    return jbean_1.annotationHelper(arguments, controllerCallback);
}
exports.Controller = Controller;
function Get(path) {
    return jbean_1.annotationHelper(['GET', path], methodCallback);
}
exports.Get = Get;
function Post(path) {
    return jbean_1.annotationHelper(['POST', path], methodCallback);
}
exports.Post = Post;
function Put(path) {
    return jbean_1.annotationHelper(['PUT', path], methodCallback);
}
exports.Put = Put;
function Patch(path) {
    return jbean_1.annotationHelper(['PATCH', path], methodCallback);
}
exports.Patch = Patch;
function Options(path) {
    return jbean_1.annotationHelper(['OPTIONS', path], methodCallback);
}
exports.Options = Options;
const controllerCallback = function (annoType, ctor, path) {
    controllers.push(ctor);
    ctor[CONTROLLER_FILE_KEY] = jbean_1.BeanFactory.getCurrentSourceFile();
    addAnno(ctor, path);
};
const methodCallback = function (annoType, target, method, descriptor, requestMethod, path) {
    addAnno(target, path, method, requestMethod, true);
};
const URL_PATH_TRIM = /^\/*|\/*$/g;
const CONTROLLER_FILE_KEY = '__file';
const controllerMetas = {};
const controllers = [];
const addAnno = function (target, path, method, requestMethod, requestMapping) {
    let ctor = target;
    if (typeof target === 'object') {
        ctor = target.constructor;
    }
    let ctorId = ctor[jbean_1.CTOR_ID];
    if (typeof controllerMetas[ctorId] === 'undefined') {
        controllerMetas[ctorId] = {
            ctor: ctor,
            methods: [],
            path: ''
        };
    }
    let metas = controllerMetas[ctorId];
    if (!method) {
        metas.path = '/' + (path || '').replace(URL_PATH_TRIM, '');
        metas.path = (metas.path === '/') ? metas.path : (metas.path + '/');
    }
    else {
        metas.methods.push({
            target: target,
            method: method,
            requestMethod: requestMethod,
            subPath: (path || '').replace(URL_PATH_TRIM, ''),
            requestMapping: requestMapping
        });
    }
};
jbean_1.BeanFactory.registerInitBean(() => {
    controllers.forEach((controller) => {
        jbean_1.ReflectHelper.resetClass(controller);
    });
});
const controllerIns = {};
const TEMPLATE_DIR_NAME = 'template';
const LAYOUT_DIR_NAME = 'layout';
exports.TPL_DIR_KEY = '__tplDir';
exports.LAYOUT_DIR_KEY = '__layoutDir';
exports.EXT_KEY = '__tplExt';
exports.METHOD_KEY = '__method';
const addTemplateDir = function (ctor, ins) {
    if (typeof ctor[exports.METHOD_KEY] === 'undefined') {
        const application = application_1.default.getIns();
        let controllerPath = ctor[CONTROLLER_FILE_KEY].split(application.controllerDir);
        let viewDir = application.viewDir;
        if (!Path.isAbsolute(viewDir)) {
            viewDir = Path.join(application.root, viewDir);
        }
        ctor[exports.TPL_DIR_KEY] = viewDir + Path.sep
            + TEMPLATE_DIR_NAME + Path.sep
            + controllerPath.pop().replace(URL_PATH_TRIM, '').slice(0, -3).toLowerCase() + Path.sep;
        ctor[exports.LAYOUT_DIR_KEY] = viewDir + Path.sep + LAYOUT_DIR_NAME + Path.sep;
        ctor[exports.EXT_KEY] = application.tplExt;
    }
    if (typeof ins === 'object' && typeof ins[exports.TPL_DIR_KEY] === 'undefined') {
        ins[exports.TPL_DIR_KEY] = ctor[exports.TPL_DIR_KEY];
        ins[exports.LAYOUT_DIR_KEY] = ctor[exports.LAYOUT_DIR_KEY];
        ins[exports.EXT_KEY] = ctor[exports.EXT_KEY];
    }
};
jbean_1.BeanFactory.registerStartBean(() => {
    const app = application_1.default.getIns();
    if (app.applicationType !== application_1.ApplicationType.web) {
        return;
    }
    Object.values(controllerMetas).forEach(({ ctor, methods, path }) => {
        methods.forEach(({ target, method, requestMethod, subPath, requestMapping }) => {
            if (!requestMapping) {
                return;
            }
            const app = application_1.default.getIns();
            app.route({
                method: requestMethod,
                path: path + subPath,
                handler: (request, h) => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        const req = new base_1.Request(request, h);
                        const res = new base_1.Response(request, h);
                        let ins = target;
                        if (typeof target !== 'function') {
                            if (typeof controllerIns[ctor[jbean_1.CTOR_ID]] === 'undefined') {
                                controllerIns[ctor[jbean_1.CTOR_ID]] = new ctor();
                            }
                            ins = controllerIns[ctor[jbean_1.CTOR_ID]];
                            addTemplateDir(ctor, ins);
                        }
                        ins[exports.METHOD_KEY] = method.toLowerCase();
                        let params = [req, res];
                        if (request.params && Object.keys(request.params).length > 0) {
                            params.push(request.params);
                        }
                        try {
                            res.type('text/html');
                            const ret = ins[method](...params);
                            if (jbean_1.getObjectType(ret) === 'promise') {
                                ret.then(data => {
                                    res.writeAndFlush(data);
                                    // resolve()
                                }).catch(e => {
                                    app.emit(application_1.AppErrorEvent.REQUEST, e);
                                    res.error('Internal Server Error');
                                });
                            }
                            else {
                                res.writeAndFlush(ret);
                                // resolve()
                            }
                        }
                        catch (e) {
                            app.emit(application_1.AppErrorEvent.REQUEST, e);
                            res.error('Internal Server Error');
                        }
                    });
                })
            });
        });
    });
});
