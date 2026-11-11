package cn.kanban.dto;

public record UpdateGroupRequest(String name, Long parentId, Integer sort) {}
