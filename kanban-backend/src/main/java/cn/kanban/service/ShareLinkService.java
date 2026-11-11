package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.ShareLink;

public interface ShareLinkService extends IService<ShareLink> {
    ShareLink create(Long projectId, Long snapshotId, String password);
    ShareLink findByToken(String token);
}
