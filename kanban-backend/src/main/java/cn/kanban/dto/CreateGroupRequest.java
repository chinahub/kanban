package cn.kanban.dto;

public record CreateGroupRequest(String name, Long parentId, Integer sort) {}
