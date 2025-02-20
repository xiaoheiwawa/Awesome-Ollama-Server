"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorServices = monitorServices;
exports.getData = getData;
var promises_1 = require("fs/promises");
var path_1 = require("path");
var TEST_PROMPT = "Tell me a short joke";
var TIMEOUT_MS = 10000; // 10秒超时
// 创建带超时的 fetch 函数
function fetchWithTimeout(url_1) {
    return __awaiter(this, arguments, void 0, function (url, options, timeout) {
        var controller, timeoutId, response, error_1;
        if (options === void 0) { options = {}; }
        if (timeout === void 0) { timeout = TIMEOUT_MS; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    controller = new AbortController();
                    timeoutId = setTimeout(function () { return controller.abort(); }, timeout);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { signal: controller.signal }))];
                case 2:
                    response = _a.sent();
                    clearTimeout(timeoutId);
                    return [2 /*return*/, response];
                case 3:
                    error_1 = _a.sent();
                    clearTimeout(timeoutId);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function readUrls() {
    return __awaiter(this, void 0, void 0, function () {
        var content, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.readFile('url.txt', 'utf-8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, content.split('\n').filter(function (url) { return url.trim(); })];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error reading url.txt:', error_2);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function checkService(url) {
    return __awaiter(this, void 0, void 0, function () {
        var response, data, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetchWithTimeout("".concat(url, "/api/tags"), {
                            headers: {
                                'Accept': 'application/json',
                            },
                        })];
                case 1:
                    response = _b.sent();
                    if (!response.ok) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _b.sent();
                    return [2 /*return*/, ((_a = data.models) === null || _a === void 0 ? void 0 : _a.map(function (model) { return model.name; })) || []];
                case 3:
                    error_3 = _b.sent();
                    if (error_3.name === 'AbortError') {
                        console.error("\u68C0\u67E5\u670D\u52A1\u8D85\u65F6 ".concat(url));
                    }
                    else {
                        console.error("\u68C0\u67E5\u670D\u52A1\u51FA\u9519 ".concat(url, ":"), error_3);
                    }
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function measureTPS(url, model) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, response, endTime, timeInSeconds, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    startTime = Date.now();
                    return [4 /*yield*/, fetchWithTimeout("".concat(url, "/api/generate"), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                model: model,
                                prompt: TEST_PROMPT,
                                stream: false,
                            }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        return [2 /*return*/, 0];
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    _a.sent();
                    endTime = Date.now();
                    timeInSeconds = (endTime - startTime) / 1000;
                    return [2 /*return*/, timeInSeconds > 0 ? 1 / timeInSeconds : 0];
                case 3:
                    error_4 = _a.sent();
                    if (error_4.name === 'AbortError') {
                        console.error("\u6027\u80FD\u6D4B\u8BD5\u8D85\u65F6 ".concat(url));
                    }
                    else {
                        console.error("\u6027\u80FD\u6D4B\u8BD5\u51FA\u9519 ".concat(url, ":"), error_4);
                    }
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function monitorServices() {
    return __awaiter(this, void 0, void 0, function () {
        var urls, results, i, url, models, tps, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('开始读取 URL 列表...');
                    return [4 /*yield*/, readUrls()];
                case 1:
                    urls = _a.sent();
                    console.log("\u5171\u8BFB\u53D6\u5230 ".concat(urls.length, " \u4E2A\u670D\u52A1\u5730\u5740"));
                    results = [];
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < urls.length)) return [3 /*break*/, 7];
                    url = urls[i];
                    console.log("\n[".concat(i + 1, "/").concat(urls.length, "] \u6B63\u5728\u68C0\u67E5\u670D\u52A1: ").concat(url));
                    console.log("  - \u68C0\u67E5\u6A21\u578B\u5217\u8868...");
                    return [4 /*yield*/, checkService(url)];
                case 3:
                    models = _a.sent();
                    if (!(models && models.length > 0)) return [3 /*break*/, 5];
                    console.log("  - \u53D1\u73B0 ".concat(models.length, " \u4E2A\u6A21\u578B: ").concat(models.join(', ')));
                    console.log("  - \u6B63\u5728\u6D4B\u8BD5\u6027\u80FD (\u4F7F\u7528\u6A21\u578B: ".concat(models[0], ")..."));
                    return [4 /*yield*/, measureTPS(url, models[0])];
                case 4:
                    tps = _a.sent();
                    console.log("  - \u6027\u80FD\u6D4B\u8BD5\u5B8C\u6210: ".concat(tps.toFixed(2), " TPS"));
                    results.push({
                        server: url,
                        models: models,
                        tps: tps,
                        lastUpdate: new Date().toISOString(),
                    });
                    return [3 /*break*/, 6];
                case 5:
                    console.log("  - \u670D\u52A1\u4E0D\u53EF\u7528\u6216\u672A\u53D1\u73B0\u6A21\u578B");
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 2];
                case 7:
                    console.log('\n保存监控结果...');
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, promises_1.default.writeFile(path_1.default.join(process.cwd(), 'public', 'data.json'), JSON.stringify(results, null, 2))];
                case 9:
                    _a.sent();
                    console.log("\u6210\u529F\u4FDD\u5B58\u7ED3\u679C\uFF0C\u5171 ".concat(results.length, " \u4E2A\u53EF\u7528\u670D\u52A1"));
                    return [3 /*break*/, 11];
                case 10:
                    error_5 = _a.sent();
                    console.error('保存数据失败:', error_5);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
function getData() {
    return __awaiter(this, void 0, void 0, function () {
        var data, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.readFile(path_1.default.join(process.cwd(), 'public', 'data.json'), 'utf-8')];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, JSON.parse(data)];
                case 2:
                    error_6 = _a.sent();
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
