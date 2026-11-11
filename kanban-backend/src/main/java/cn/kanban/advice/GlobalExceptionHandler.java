package cn.kanban.advice;

import cn.kanban.dto.ApiError;
import cn.jiebaba.summer.web.annotation.ExceptionHandler;
import cn.jiebaba.summer.web.annotation.ResponseStatus;
import cn.jiebaba.summer.web.annotation.RestControllerAdvice;
import cn.jiebaba.summer.web.bind.HandlerException;

import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler
    @ResponseStatus(400)
    public ApiError handleIllegalArgument(IllegalArgumentException ex) {
        return new ApiError(400, "Bad Request", ex.getMessage());
    }

    /** summer 3.2 起参数绑定失败（缺路径变量/请求头/请求体、请求体非法 JSON）统一抛 HandlerException，属客户端错误应返回 400 */
    @ExceptionHandler
    @ResponseStatus(400)
    public ApiError handleHandlerException(HandlerException ex) {
        return new ApiError(400, "Bad Request", ex.getMessage());
    }

    @ExceptionHandler
    @ResponseStatus(404)
    public ApiError handleNotFound(NoSuchElementException ex) {
        return new ApiError(404, "Not Found", ex.getMessage());
    }

    @ExceptionHandler
    @ResponseStatus(500)
    public ApiError handleAny(Exception ex) {
        return new ApiError(500, "Internal Server Error",
                ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage());
    }
}
