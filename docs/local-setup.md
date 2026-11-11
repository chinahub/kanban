# 本地配置与密钥

公开仓库不包含任何数据库密码、JWT secret 或 API Key。首次运行前，在仓库根目录创建
`build-test/secrets.env`（该目录已被 `.gitignore` 忽略，仅本地有效）：

```dotenv
SUMMER_DATASOURCE_URL=jdbc:postgresql://localhost:5432/kanban
SUMMER_DATASOURCE_USERNAME=postgres
SUMMER_DATASOURCE_PASSWORD=your-db-password
KANBAN_JWT_SECRET=your-jwt-secret
KANBAN_BOOTSTRAP_ADMIN_USERNAME=admin
KANBAN_BOOTSTRAP_ADMIN_PASSWORD=your-admin-password
SUMMER_AI_API_KEY=your-api-key
KANBAN_LADV_API_KEY=
SUMMER_AI_EMBEDDING_ONNX_LIB_PATH=
SUMMER_AI_EMBEDDING_ONNX_MODEL_PATH=
SUMMER_AI_EMBEDDING_ONNX_TOKENIZER_PATH=
```

`scripts/dev.ps1` 启动时会自动读取该文件并注入进程环境变量；也可以手动设置
`$env:KEY="value"`。`application.yml` 里对应的占位符格式为 `${ENV_NAME:}`。

> 不要提交 `build-test/`、`.env` 或任何包含真实密码的文件。
