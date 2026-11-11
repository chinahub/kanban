package cn.kanban.dto;

public class ApiError {
    public int status;
    public String error;
    public String message;

    public ApiError() {}
    public ApiError(int status, String error, String message) {
        this.status = status;
        this.error = error;
        this.message = message;
    }
}
