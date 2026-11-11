package cn.kanban.service;

import cn.kanban.entity.User;
import cn.jiebaba.summer.data.service.IService;

public interface UserService extends IService<User> {
    User findByUsername(String username);
    User findById(Long id);
    User create(String username, String rawPassword, String displayName, boolean platformAdmin);
}
