package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.ShareLink;
import cn.kanban.mapper.ShareLinkMapper;
import cn.kanban.util.PasswordUtil;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.util.List;

@Service
public class ShareLinkServiceImpl extends ServiceImpl<ShareLinkMapper, ShareLink> implements ShareLinkService {

    private static final SecureRandom RNG = new SecureRandom();

    @Autowired
    public void setMapper(ShareLinkMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public ShareLink create(Long projectId, Long snapshotId, String password) {
        ShareLink sl = new ShareLink();
        sl.projectId = projectId;
        sl.snapshotId = snapshotId;
        sl.token = generateToken();
        sl.passwordHash = (password != null && !password.isBlank()) ? PasswordUtil.hash(password) : null;
        sl.createdAt = new Timestamp(System.currentTimeMillis());
        save(sl);
        return sl;
    }

    @Override
    public ShareLink findByToken(String token) {
        if (token == null || token.isBlank()) return null;
        List<ShareLink> list = list(new QueryWrapper<ShareLink>().eq("token", token));
        return list.isEmpty() ? null : list.get(0);
    }

    private static String generateToken() {
        byte[] bytes = new byte[16];
        RNG.nextBytes(bytes);
        StringBuilder sb = new StringBuilder(32);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
