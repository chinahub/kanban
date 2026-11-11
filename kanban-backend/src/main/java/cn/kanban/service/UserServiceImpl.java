package cn.kanban.service;

import cn.kanban.entity.User;
import cn.kanban.mapper.UserMapper;
import cn.kanban.util.PasswordUtil;
import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    public void setMapper(UserMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public User findByUsername(String username) {
        if (username == null) return null;
        return getOne(new QueryWrapper<User>().eq("username", username));
    }

    @Override
    public User findById(Long id) {
        if (id == null) return null;
        return getById(id);
    }

    @Override
    public User create(String username, String rawPassword, String displayName, boolean platformAdmin) {
        User u = new User();
        u.username = username;
        u.passwordHash = PasswordUtil.hash(rawPassword);
        u.displayName = displayName == null ? username : displayName;
        u.status = "ACTIVE";
        u.isPlatformAdmin = platformAdmin;
        save(u);
        return u;
    }
}
