package cn.kanban.service;

import cn.jiebaba.summer.core.annotation.Autowired;
import cn.jiebaba.summer.core.annotation.Service;
import cn.jiebaba.summer.data.conditions.QueryWrapper;
import cn.jiebaba.summer.data.service.ServiceImpl;
import cn.kanban.entity.Asset;
import cn.kanban.mapper.AssetMapper;
import cn.kanban.storage.StorageProvider;

import java.sql.Timestamp;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class AssetServiceImpl extends ServiceImpl<AssetMapper, Asset> implements AssetService {

    private final StorageProvider storageProvider;

    public AssetServiceImpl(StorageProvider storageProvider) {
        this.storageProvider = storageProvider;
    }

    @Autowired
    public void setMapper(AssetMapper mapper) {
        this.baseMapper = mapper;
    }

    @Override
    public List<Asset> listByWorkspace(Long wsId) {
        if (wsId == null) return List.of();
        return list(new QueryWrapper<Asset>().eq("workspace_id", wsId).orderByDesc("created_at"));
    }

    @Override
    public Asset findById(Long id, Long wsId) {
        if (id == null) return null;
        Asset a = getById(id);
        if (a != null && wsId != null && !wsId.equals(a.workspaceId)) return null;
        return a;
    }

    @Override
    public Asset create(Long wsId, Long creatorId, String name, String contentType, byte[] data) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        if (data == null || data.length == 0) throw new IllegalArgumentException("data is required");
        String storagePath = storageProvider.store(data, contentType, name);
        Asset a = new Asset();
        a.workspaceId = wsId;
        a.creatorId = creatorId;
        a.name = name.trim();
        a.contentType = contentType;
        a.storagePath = storagePath;
        a.size = (long) data.length;
        a.type = guessType(contentType, name);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        a.createdAt = now;
        a.updatedAt = now;
        save(a);
        return a;
    }

    @Override
    public void delete(Long id, Long wsId) {
        Asset a = findById(id, wsId);
        if (a == null) throw new NoSuchElementException("asset not found");
        removeById(id);
    }

    private String guessType(String contentType, String name) {
        if (contentType != null) {
            if (contentType.startsWith("image/")) return "image";
            if (contentType.startsWith("video/")) return "video";
            if (contentType.startsWith("audio/")) return "audio";
        }
        if (name != null) {
            String lower = name.toLowerCase();
            if (lower.matches(".*\\.(png|jpe?g|gif|webp|bmp|svg)$")) return "image";
            if (lower.matches(".*\\.(mp4|webm|mov|avi)$")) return "video";
            if (lower.matches(".*\\.(ttf|otf|woff2?)$")) return "font";
        }
        return "file";
    }
}
