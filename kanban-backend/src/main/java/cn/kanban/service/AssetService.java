package cn.kanban.service;

import cn.jiebaba.summer.data.service.IService;
import cn.kanban.entity.Asset;

import java.util.List;

public interface AssetService extends IService<Asset> {
    List<Asset> listByWorkspace(Long wsId);
    Asset findById(Long id, Long wsId);
    Asset create(Long wsId, Long creatorId, String name, String contentType, byte[] data);
    void delete(Long id, Long wsId);
}
